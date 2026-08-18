import * as fs from "fs";
import * as path from "path";
import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";
import * as k8s from "@pulumi/kubernetes";

const config = new pulumi.Config();
const sshHost = config.require("sshHost");
const sshUser = config.require("sshUser");
const nodeLanIp = config.require("nodeLanIp");
const opServiceAccountToken = config.requireSecret("opServiceAccountToken");

const GATEWAY_API_VERSION = "v1.6.1";
const ARGOCD_VERSION = "v3.5.1";

const connection: command.types.input.remote.ConnectionArgs = {
  host: sshHost,
  user: sshUser,
};

// -- Get k0s ready on the Pi (no-op today; codifies the step for rebuilds/new nodes) --

const ensureK0s = new command.remote.Command("ensure-k0s", {
  connection,
  create: fs.readFileSync(path.join(__dirname, "scripts/ensure-k0s.sh"), "utf8"),
});

const getKubeconfig = new command.remote.Command(
  "get-kubeconfig",
  {
    connection,
    create: "sudo k0s kubeconfig admin",
  },
  { dependsOn: ensureK0s },
);

// The kubeconfig k0s prints is scoped to localhost; point it at the LAN IP so it's
// usable from the machine running `pulumi up`.
const kubeconfig = getKubeconfig.stdout.apply((kc) =>
  kc.replace(/https:\/\/(localhost|127\.0\.0\.1):6443/, `https://${nodeLanIp}:6443`),
);

const k0s = new k8s.Provider("k0s", { kubeconfig });

// -- Gateway API CRDs (standard channel) --

const gatewayApiCrds = new k8s.yaml.ConfigFile(
  "gateway-api-crds",
  {
    file: `https://github.com/kubernetes-sigs/gateway-api/releases/download/${GATEWAY_API_VERSION}/standard-install.yaml`,
  },
  { provider: k0s },
);

// -- ArgoCD --

const argocdNamespace = new k8s.core.v1.Namespace(
  "argocd",
  { metadata: { name: "argocd" } },
  { provider: k0s },
);

// ArgoCD's install.yaml is a ~2MB, 58-document manifest with huge embedded CRD
// schemas — k8s.yaml.ConfigFile silently decoded it to zero resources (no error,
// no pods, no CRDs). `kubectl apply` on the node itself handles it fine, so shell
// out over the same SSH connection instead. Waits for the Application CRD to be
// Established so the root Application below doesn't race it.
const argocdInstall = new command.remote.Command(
  "install-argocd",
  {
    connection,
    create: `sudo k0s kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/${ARGOCD_VERSION}/manifests/install.yaml && sudo k0s kubectl wait --for=condition=Established crd/applications.argoproj.io --timeout=60s`,
  },
  { dependsOn: [ensureK0s, argocdNamespace] },
);

// Let ArgoCD's kustomize builds inflate helm charts (addons/envoy-gateway uses this).
const argocdCmPatch = new k8s.core.v1.ConfigMapPatch(
  "argocd-cm-kustomize-helm",
  {
    metadata: { name: "argocd-cm", namespace: "argocd" },
    data: { "kustomize.buildOptions": "--enable-helm" },
  },
  { provider: k0s, dependsOn: argocdInstall },
);

// LAN-only, no TLS cert yet: serve ArgoCD over plain HTTP behind the gateway.
const argocdCmdParamsPatch = new k8s.core.v1.ConfigMapPatch(
  "argocd-cmd-params-cm-insecure",
  {
    metadata: { name: "argocd-cmd-params-cm", namespace: "argocd" },
    data: { "server.insecure": "true" },
  },
  { provider: k0s, dependsOn: argocdInstall },
);

// -- 1Password: the one bootstrap secret the operator needs to authenticate itself.
// Everything else flows through OnePasswordItem CRDs once the operator addon is synced. --

const onepasswordNamespace = new k8s.core.v1.Namespace(
  "onepassword",
  { metadata: { name: "onepassword" } },
  { provider: k0s },
);

const onepasswordServiceAccountSecret = new k8s.core.v1.Secret(
  "onepassword-service-account-token",
  {
    metadata: { name: "onepassword-service-account-token", namespace: "onepassword" },
    stringData: { token: opServiceAccountToken },
  },
  { provider: k0s, dependsOn: onepasswordNamespace },
);

// -- Hand off to ArgoCD: apply the root Application + ArgoCD's own HTTPRoute --

const repoRoot = path.join(__dirname, "..", "..");

const rootApp = new k8s.yaml.ConfigFile(
  "root-app",
  { file: path.join(repoRoot, "bootstrap/argocd/root-app.yaml") },
  {
    provider: k0s,
    dependsOn: [gatewayApiCrds, argocdInstall, argocdCmPatch, argocdCmdParamsPatch, onepasswordServiceAccountSecret],
  },
);

const argocdHttpRoute = new k8s.yaml.ConfigFile(
  "argocd-httproute",
  { file: path.join(repoRoot, "bootstrap/argocd/httproute.yaml") },
  { provider: k0s, dependsOn: [gatewayApiCrds, argocdInstall] },
);

export const argocdUrl = "http://argo.homelab.dev";
