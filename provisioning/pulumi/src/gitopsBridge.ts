import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { getKubernetesProvider } from "./raspberryPiK0s";

export interface GitopsBridgeInstallOptions {
  dependsOn?: pulumi.Resource | pulumi.Resource[];
}

export class GitopsBridge extends pulumi.ComponentResource {
  private static instance: GitopsBridge | undefined;

  static install(options: GitopsBridgeInstallOptions = {}): GitopsBridge {
    if (!GitopsBridge.instance) {
      GitopsBridge.instance = new GitopsBridge(options);
    }
    return GitopsBridge.instance;
  }

  private constructor(options: GitopsBridgeInstallOptions) {
    super("home-server:index:GitopsBridge", "gitops-bridge");
    const k8sProvider = getKubernetesProvider();
    const argocdConfig = new pulumi.Config("argocd");
    const gitRepoUrl = argocdConfig.require("gitRepoUrl");
    const gitRevision = argocdConfig.require("gitRevision");
    const domain = new pulumi.Config("homelab").require("domain");

    new k8s.core.v1.Secret(
      "argocd-in-cluster",
      {
        metadata: {
          name: "in-cluster",
          namespace: "argocd",
          labels: { "argocd.argoproj.io/secret-type": "cluster" },
          annotations: {
            addons_repo_url: gitRepoUrl,
            addons_repo_revision: gitRevision,
            addons_domain: domain,
          },
        },
        stringData: {
          name: "in-cluster",
          server: "https://kubernetes.default.svc",
          config: JSON.stringify({ tlsClientConfig: { insecure: false } }),
        },
      },
      { provider: k8sProvider.provider, dependsOn: options.dependsOn, parent: this },
    );

    this.registerOutputs({});
  }
}
