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

  static install(): ArgoCd {
    if (!ArgoCd.instance) {
      ArgoCd.instance = new ArgoCd();
    }
    return ArgoCd.instance;
  }

  static init(options: ArgoCdInitOptions): pulumi.Resource {
    return ArgoCd.install().applyRootApp(options.dependsOn);
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

    const dexClientSecret = k8s.core.v1.Secret.get(
      "dex-oidc-dex-secret",
      "dex/oidc-dex",
      { provider: this.k8sProvider.provider, parent: this },
    );

    new k8s.core.v1.Secret(
      "argocd-oidc-dex-secret",
      {
        metadata: {
          name: "oidc-dex",
          namespace: "argocd",
          labels: { "app.kubernetes.io/part-of": "argocd" },
        },
        data: { password: dexClientSecret.data["password"] },
      },
      { provider: this.k8sProvider.provider, dependsOn: installed, parent: this },
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
      { provider: this.k8sProvider.provider, dependsOn: installed, parent: this },
    );

    const homelabCa = k8s.core.v1.Secret.get(
      "homelab-ca-secret",
      "cert-manager/homelab-ca-secret",
      { provider: this.k8sProvider.provider, parent: this },
    );

    const homelabCaCert = new k8s.core.v1.Secret(
      "homelab-ca-cert",
      {
        metadata: { name: "homelab-ca-cert", namespace: "argocd" },
        data: { "ca.crt": homelabCa.data["ca.crt"] },
      },
      { provider: this.k8sProvider.provider, dependsOn: installed, parent: this },
    );

    new k8s.apps.v1.DeploymentPatch(
      "argocd-server-dex-trust",
      {
        metadata: { name: "argocd-server", namespace: "argocd" },
        spec: {
          template: {
            spec: {
              hostAliases: [{ ip: nodeLanIp, hostnames: [`dex.${domain}`] }],
              volumes: [
                { name: "homelab-ca", secret: { secretName: "homelab-ca-cert" } },
                { name: "merged-ca-bundle", emptyDir: {} },
              ],
              initContainers: [
                {
                  name: "merge-ca-bundle",
                  image: `quay.io/argoproj/argocd:${version}`,
                  command: [
                    "sh",
                    "-c",
                    "cat /etc/ssl/certs/ca-certificates.crt /homelab-ca/ca.crt > /merged/ca-certificates.crt",
                  ],
                  volumeMounts: [
                    { name: "homelab-ca", mountPath: "/homelab-ca", readOnly: true },
                    { name: "merged-ca-bundle", mountPath: "/merged" },
                  ],
                },
              ],
              containers: [
                {
                  name: "argocd-server",
                  env: [{ name: "SSL_CERT_FILE", value: "/merged/ca-certificates.crt" }],
                  volumeMounts: [{ name: "merged-ca-bundle", mountPath: "/merged", readOnly: true }],
                },
              ],
            },
          },
        },
      },
      { provider: this.k8sProvider.provider, dependsOn: [installed, homelabCaCert], parent: this },
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

    new k8s.apps.v1.DeploymentPatch(
      "argocd-server-rollouts-extension",
      {
        metadata: { name: "argocd-server", namespace: "argocd" },
        spec: {
          template: {
            spec: {
              volumes: [{ name: "extensions", emptyDir: {} }],
              initContainers: [
                {
                  name: "rollout-extension",
                  image: `quay.io/argoprojlabs/argocd-extension-installer:${ROLLOUTS_EXTENSION_INSTALLER_VERSION}`,
                  env: [
                    {
                      name: "EXTENSION_URL",
                      value: `https://github.com/argoproj-labs/rollout-extension/releases/download/${ROLLOUTS_EXTENSION_VERSION}/extension.tar`,
                    },
                  ],
                  volumeMounts: [{ name: "extensions", mountPath: "/tmp/extensions/" }],
                  securityContext: { runAsUser: 1000, allowPrivilegeEscalation: false },
                },
              ],
              containers: [
                {
                  name: "argocd-server",
                  volumeMounts: [{ name: "extensions", mountPath: "/tmp/extensions/", readOnly: true }],
                },
              ],
            },
          },
        },
      },
      { provider: this.k8sProvider.provider, dependsOn: installed, parent: this },
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
}
