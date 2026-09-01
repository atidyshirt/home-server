import * as fs from "fs";
import * as path from "path";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { getKubernetesProvider } from "./raspberryPiK0s";

const REPO_ROOT = path.join(__dirname, "..", "..", "..");

// argoproj-labs/rollout-extension requires Argo CD v3.5+; check both when bumping either.
const ROLLOUTS_EXTENSION_VERSION = "v0.4.0";
const ROLLOUTS_EXTENSION_INSTALLER_VERSION = "v1.0.1";

export interface ArgoCdInitOptions {
  dependsOn: pulumi.Resource | pulumi.Resource[];
}

export class ArgoCd extends pulumi.ComponentResource {
  private static instance: ArgoCd | undefined;
  private readonly k8sProvider = getKubernetesProvider();
  // Public (not just used internally) so GitopsBridge can depend on just this - not the whole
  // ArgoCd component - see index.ts's own comment on gitopsBridge for why depending on the
  // whole component is a real circular dependency, confirmed live as a from-scratch bootstrap
  // hang (gitopsBridge's argocd-in-cluster Secret never gets created, since Pulumi's "depend on
  // a component = wait for every current-and-future child" semantics means it wait on root-app,
  // which itself depends on gitopsBridge).
  readonly installed: pulumi.Resource;

  static install(): ArgoCd {
    if (!ArgoCd.instance) {
      ArgoCd.instance = new ArgoCd();
    }
    return ArgoCd.instance;
  }

  static init(options: ArgoCdInitOptions): pulumi.Resource {
    return ArgoCd.install().applyRootApp(options.dependsOn);
  }

  // Dex and cert-manager are themselves GitOps-managed apps, only deployed once ArgoCD's root
  // Application (see applyRootApp) has synced - so this can't run as part of the constructor
  // above, which install-argocd and everything downstream of it (gitopsBridge, root-app itself)
  // transitively depends on. Call this once the root app is in place. See the ADR this method's
  // wait-for-secrets command references for the full chicken-and-egg writeup.
  static configureDexIntegration(dependsOn: pulumi.Resource | pulumi.Resource[]): pulumi.Resource {
    return ArgoCd.install().configureDexIntegrationInternal(dependsOn);
  }

  private constructor() {
    super("home-server:index:ArgoCd", "argocd");
    const version = new pulumi.Config("argocd").require("version");
    const domain = new pulumi.Config("homelab").require("domain");
    const nodeLanIp = new pulumi.Config("raspberrypi").require("nodeLanIp");

    const namespace = new k8s.core.v1.Namespace(
      "argocd",
      { metadata: { name: "argocd" } },
      { provider: this.k8sProvider.provider, parent: this, protect: true },
    );

    const installed = this.k8sProvider.applyManifest(
      "install-argocd",
      `https://raw.githubusercontent.com/argoproj/argo-cd/${version}/manifests/install.yaml`,
      {
        namespace: "argocd",
        serverSide: true,
        waitForCrd: "applications.argoproj.io",
        dependsOn: [this.k8sProvider.ready, namespace],
        parent: this,
      },
    );
    this.installed = installed;

    new k8s.core.v1.ConfigMapPatch(
      "argocd-cm-kustomize-helm",
      {
        metadata: { name: "argocd-cm", namespace: "argocd" },
        data: { "kustomize.buildOptions": "--enable-helm" },
      },
      { provider: this.k8sProvider.provider, dependsOn: installed, parent: this },
    );

    new k8s.core.v1.ConfigMapPatch(
      "argocd-cmd-params-cm-insecure",
      {
        metadata: { name: "argocd-cmd-params-cm", namespace: "argocd" },
        data: { "server.insecure": "true" },
      },
      { provider: this.k8sProvider.provider, dependsOn: installed, parent: this },
    );

    new k8s.core.v1.ConfigMapPatch(
      "argocd-rbac-cm-dex",
      {
        metadata: { name: "argocd-rbac-cm", namespace: "argocd" },
        data: {
          "policy.default": "",
          "policy.csv": ["g, homelab:admin, role:admin", "g, homelab:user, role:readonly"].join("\n"),
          scopes: "[groups]",
        },
      },
      { provider: this.k8sProvider.provider, dependsOn: installed, parent: this },
    );

    // A plain kubectl strategic-merge patch, not k8s.apps.v1.DeploymentPatch - confirmed live,
    // that resource type does a live GET of the target during `pulumi preview` regardless of
    // `dependsOn` (same issue as Secret.get(), see configureDexIntegrationInternal's comment),
    // which fails outright on a from-scratch cluster where install-argocd hasn't created
    // `argocd-server` yet. A remote command is planned during preview and only executed - in
    // dependsOn order - during apply, same as every other command.remote.Command here.
    this.k8sProvider.runCommand(
      "argocd-server-rollouts-extension",
      [
        "sudo k0s kubectl patch deployment argocd-server -n argocd --type strategic --patch-file=/dev/stdin <<'PATCH'",
        "spec:",
        "  template:",
        "    spec:",
        "      volumes:",
        "        - name: extensions",
        "          emptyDir: {}",
        "      initContainers:",
        "        - name: rollout-extension",
        `          image: quay.io/argoprojlabs/argocd-extension-installer:${ROLLOUTS_EXTENSION_INSTALLER_VERSION}`,
        "          env:",
        "            - name: EXTENSION_URL",
        `              value: https://github.com/argoproj-labs/rollout-extension/releases/download/${ROLLOUTS_EXTENSION_VERSION}/extension.tar`,
        "          volumeMounts:",
        "            - name: extensions",
        "              mountPath: /tmp/extensions/",
        "          securityContext:",
        "            runAsUser: 1000",
        "            allowPrivilegeEscalation: false",
        "      containers:",
        "        - name: argocd-server",
        "          volumeMounts:",
        "            - name: extensions",
        "              mountPath: /tmp/extensions/",
        "              readOnly: true",
        "PATCH",
      ].join("\n"),
      { dependsOn: installed, parent: this },
    );
  }

  private applyRootApp(dependsOn: pulumi.Resource | pulumi.Resource[]): pulumi.Resource {
    const argocdConfig = new pulumi.Config("argocd");
    const gitRepoUrl = argocdConfig.require("gitRepoUrl");
    const gitRevision = argocdConfig.require("gitRevision");
    const domain = new pulumi.Config("homelab").require("domain");

    const projectsYaml = fs
      .readFileSync(path.join(REPO_ROOT, "bootstrap/argocd/projects.yaml"), "utf8")
      .replace(/__GIT_REPO_URL__/g, gitRepoUrl);

    const projects = new k8s.yaml.ConfigGroup(
      "argocd-projects",
      { yaml: projectsYaml },
      { provider: this.k8sProvider.provider, dependsOn, parent: this },
    );

    const rootAppYaml = fs
      .readFileSync(path.join(REPO_ROOT, "bootstrap/argocd/root-app.yaml"), "utf8")
      .replace("repoURL: __GIT_REPO_URL__", `repoURL: ${gitRepoUrl}`)
      .replace("targetRevision: __GIT_REVISION__", `targetRevision: ${gitRevision}`);

    const rootApp = new k8s.yaml.ConfigGroup(
      "root-app",
      { yaml: rootAppYaml },
      { provider: this.k8sProvider.provider, dependsOn: [...(Array.isArray(dependsOn) ? dependsOn : [dependsOn]), projects], parent: this },
    );

    const httprouteYaml = fs
      .readFileSync(path.join(REPO_ROOT, "bootstrap/argocd/httproute.yaml"), "utf8")
      .replace("__DOMAIN__", domain);

    new k8s.yaml.ConfigGroup(
      "argocd-httproute",
      { yaml: httprouteYaml },
      { provider: this.k8sProvider.provider, dependsOn, parent: this },
    );

    this.registerOutputs({});

    return rootApp;
  }

  // dex/oidc-dex and cert-manager/homelab-ca-secret are created by ArgoCD-managed apps (Dex,
  // cert-manager), which only exist once root-app has synced them from git - so on a truly
  // from-scratch cluster (no prior ArgoCD reconciliation), those secrets don't exist the moment
  // this Pulumi program runs. Poll for them rather than reading immediately: confirmed live,
  // reading immediately fails with "resource 'dex/oidc-dex' does not exist" on a from-scratch
  // `pulumi up` (see docs/adr/advertise-api-server-via-tailscale.md's rebuild flow) since
  // ArgoCD's git sync loop takes real wall-clock time to deploy those apps.
  //
  // Reading the secrets' values themselves also can't use k8s.core.v1.Secret.get() -
  // confirmed live, `.get()` executes its read immediately during `pulumi preview` regardless
  // of `dependsOn` (it's a lookup, not a planned change, so the engine has no reason to defer
  // it), which fails preview outright before the wait-for command above ever gets a chance to
  // run. Reading the values via `kubectl get -o jsonpath` through runCommand instead behaves
  // like every other side-effecting resource here: planned during preview, only executed - and
  // ordered by dependsOn - during the actual apply.
  private configureDexIntegrationInternal(dependsOn: pulumi.Resource | pulumi.Resource[]): pulumi.Resource {
    const version = new pulumi.Config("argocd").require("version");
    const domain = new pulumi.Config("homelab").require("domain");
    const nodeLanIp = new pulumi.Config("raspberrypi").require("nodeLanIp");

    // 240 x 5s = 20min ceiling - confirmed live that 60x5s (5min) isn't enough on a genuinely
    // cold from-scratch bootstrap, where ArgoCD is syncing a dozen-plus addons at once and the
    // Pi is pulling every image from scratch with no local cache (cert-manager alone took ~8min
    // just to reach ContainerCreating; dex hadn't even started).
    const waitForSecrets = this.k8sProvider.runCommand(
      "wait-for-dex-and-ca-secrets",
      [
        "for i in $(seq 1 240); do",
        "  if sudo k0s kubectl get secret oidc-dex -n dex >/dev/null 2>&1 && \\",
        "     sudo k0s kubectl get secret homelab-ca-secret -n cert-manager >/dev/null 2>&1; then",
        "    echo 'dex/cert-manager secrets are present'",
        "    exit 0",
        "  fi",
        "  sleep 5",
        "done",
        "echo 'timed out waiting for ArgoCD to sync dex/cert-manager (dex/oidc-dex or cert-manager/homelab-ca-secret never appeared)' >&2",
        "exit 1",
      ].join("\n"),
      { dependsOn, parent: this },
    );

    // .data values are already base64 (that's the k8s Secret wire format for `data`, matching
    // what `kubectl get -o jsonpath='{.data.<key>}'` prints and what the copies below expect).
    const dexClientSecretPassword = this.k8sProvider.runCommand(
      "get-dex-oidc-secret",
      "sudo k0s kubectl get secret oidc-dex -n dex -o jsonpath='{.data.password}'",
      { dependsOn: waitForSecrets, parent: this },
    ).stdout.apply((s) => s.trim());

    new k8s.core.v1.Secret(
      "argocd-oidc-dex-secret",
      {
        metadata: {
          name: "oidc-dex",
          namespace: "argocd",
          labels: { "app.kubernetes.io/part-of": "argocd" },
        },
        data: { password: dexClientSecretPassword },
      },
      { provider: this.k8sProvider.provider, dependsOn: this.installed, parent: this },
    );

    new k8s.core.v1.ConfigMapPatch(
      "argocd-cm-oidc",
      {
        metadata: { name: "argocd-cm", namespace: "argocd" },
        data: {
          url: `https://argo.${domain}`,
          "oidc.config": [
            "name: Dex",
            `issuer: https://dex.${domain}`,
            "clientID: argocd",
            "clientSecret: $oidc-dex:password",
            "requestedScopes:",
            "  - openid",
            "  - profile",
            "  - email",
            "  - groups",
          ].join("\n"),
        },
      },
      { provider: this.k8sProvider.provider, dependsOn: this.installed, parent: this },
    );

    const homelabCaCrt = this.k8sProvider.runCommand(
      "get-homelab-ca-secret",
      "sudo k0s kubectl get secret homelab-ca-secret -n cert-manager -o jsonpath='{.data.ca\\.crt}'",
      { dependsOn: waitForSecrets, parent: this },
    ).stdout.apply((s) => s.trim());

    const homelabCaCert = new k8s.core.v1.Secret(
      "homelab-ca-cert",
      {
        metadata: { name: "homelab-ca-cert", namespace: "argocd" },
        data: { "ca.crt": homelabCaCrt },
      },
      { provider: this.k8sProvider.provider, dependsOn: this.installed, parent: this },
    );

    // Plain kubectl patch, not k8s.apps.v1.DeploymentPatch - see the comment on
    // argocd-server-rollouts-extension in the constructor for why (live GET during preview
    // fails against a from-scratch cluster where argocd-server doesn't exist yet).
    return this.k8sProvider.runCommand(
      "argocd-server-dex-trust",
      [
        "sudo k0s kubectl patch deployment argocd-server -n argocd --type strategic --patch-file=/dev/stdin <<'PATCH'",
        "spec:",
        "  template:",
        "    spec:",
        "      hostAliases:",
        `        - ip: ${nodeLanIp}`,
        `          hostnames: ["dex.${domain}"]`,
        "      volumes:",
        "        - name: homelab-ca",
        "          secret:",
        "            secretName: homelab-ca-cert",
        "        - name: merged-ca-bundle",
        "          emptyDir: {}",
        "      initContainers:",
        "        - name: merge-ca-bundle",
        `          image: quay.io/argoproj/argocd:${version}`,
        '          command: ["sh", "-c", "cat /etc/ssl/certs/ca-certificates.crt /homelab-ca/ca.crt > /merged/ca-certificates.crt"]',
        "          volumeMounts:",
        "            - name: homelab-ca",
        "              mountPath: /homelab-ca",
        "              readOnly: true",
        "            - name: merged-ca-bundle",
        "              mountPath: /merged",
        "      containers:",
        "        - name: argocd-server",
        "          env:",
        "            - name: SSL_CERT_FILE",
        "              value: /merged/ca-certificates.crt",
        "          volumeMounts:",
        "            - name: merged-ca-bundle",
        "              mountPath: /merged",
        "              readOnly: true",
        "PATCH",
      ].join("\n"),
      { dependsOn: [this.installed, homelabCaCert], parent: this },
    );
  }
}
