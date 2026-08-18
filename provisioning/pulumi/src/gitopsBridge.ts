import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { KubernetesProvider } from "./kubernetesProvider";

export interface GitopsBridgeArgs {
  repoUrl: string;
  revision: string;
  dependsOn: pulumi.Resource;
}

export class GitopsBridge {
  readonly clusterSecret: k8s.core.v1.Secret;

  constructor(k8sProvider: KubernetesProvider, args: GitopsBridgeArgs) {
    this.clusterSecret = new k8s.core.v1.Secret(
      "argocd-in-cluster",
      {
        metadata: {
          name: "in-cluster",
          namespace: "argocd",
          labels: { "argocd.argoproj.io/secret-type": "cluster" },
          annotations: {
            addons_repo_url: args.repoUrl,
            addons_repo_revision: args.revision,
          },
        },
        stringData: {
          name: "in-cluster",
          server: "https://kubernetes.default.svc",
          config: JSON.stringify({ tlsClientConfig: { insecure: false } }),
        },
      },
      { provider: k8sProvider.provider, dependsOn: args.dependsOn },
    );
  }
}
