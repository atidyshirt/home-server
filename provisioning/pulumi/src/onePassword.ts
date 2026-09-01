import * as fs from "fs";
import * as path from "path";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { getKubernetesProvider } from "./raspberryPiK0s";

const REPO_ROOT = path.join(__dirname, "..", "..", "..");
const ONEPASSWORD_ITEM_CRD = path.join(
  REPO_ROOT,
  "applications/onepassword-operator/base/charts/connect-2.4.1/connect/crds/onepassworditem-crd.yaml",
);

export class OnePassword extends pulumi.ComponentResource {
  private static instance: OnePassword | undefined;

  static install(): OnePassword {
    if (!OnePassword.instance) {
      OnePassword.instance = new OnePassword();
    }
    return OnePassword.instance;
  }

  private constructor() {
    super("home-server:index:OnePassword", "onepassword");
    const k8sProvider = getKubernetesProvider();
    const config = new pulumi.Config("onepassword");
    const serviceAccountToken = config.requireSecret("serviceAccountToken");
    const connectCredentials = config.requireSecret("connectCredentials");
    const connectToken = config.requireSecret("connectToken");

    const namespace = new k8s.core.v1.Namespace(
      "onepassword",
      { metadata: { name: "onepassword" } },
      { provider: k8sProvider.provider, parent: this, protect: true },
    );

    new k8s.core.v1.Secret(
      "onepassword-service-account-token",
      {
        metadata: { name: "onepassword-service-account-token", namespace: "onepassword" },
        stringData: { token: serviceAccountToken },
      },
      { provider: k8sProvider.provider, dependsOn: namespace, parent: this },
    );

    new k8s.core.v1.Secret(
      "op-credentials",
      {
        metadata: { name: "op-credentials", namespace: "onepassword" },
        stringData: { "1password-credentials.json": connectCredentials },
      },
      { provider: k8sProvider.provider, dependsOn: namespace, parent: this },
    );

    new k8s.core.v1.Secret(
      "onepassword-token",
      {
        metadata: { name: "onepassword-token", namespace: "onepassword" },
        stringData: { token: connectToken },
      },
      { provider: k8sProvider.provider, dependsOn: namespace, parent: this },
    );

    // The connect chart ships this CRD under its own crds/ folder, which Helm only ever
    // installs via `helm install`'s dedicated first-install step - `helm template` (what
    // ArgoCD's Helm-via-Kustomize rendering actually calls) silently drops crds/ entirely, on
    // every sync, forever. Confirmed live on a from-scratch rebuild: the operator pod
    // crash-loops forever with `no matches for kind "OnePasswordItem" in version
    // "onepassword.com/v1"` since the CRD never gets applied by ArgoCD at all - it must have
    // been applied once by hand outside of git history on this cluster's original bootstrap.
    // Installed the same way as ArgoCD's own CRDs and the Gateway API CRDs (applyManifest/
    // runCommand, not a GitOps-managed resource) so a from-scratch rebuild doesn't need that
    // undocumented manual step repeated.
    k8sProvider.runCommand(
      "install-onepassword-crd",
      `sudo k0s kubectl apply -f - <<'CRD'\n${fs.readFileSync(ONEPASSWORD_ITEM_CRD, "utf8")}\nCRD`,
      { parent: this },
    );

    this.registerOutputs({});
  }
}
