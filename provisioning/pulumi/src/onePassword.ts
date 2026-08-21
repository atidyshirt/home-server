import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { getKubernetesProvider } from "./raspberryPiK0s";

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

    this.registerOutputs({});
  }
}
