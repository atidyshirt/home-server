import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { getKubernetesProvider } from "./raspberryPiK0s";

export interface GitopsBridgeInstallOptions {
  dependsOn?: pulumi.Resource | pulumi.Resource[];
}

// One label per addon-*-appset.yaml cluster-generator selector (see
// docs/adr/gate-addon-stacks-via-pulumi-managed-cluster-labels.md). "platform" covers the
// core addons that are always expected to be on together; coredns-lan/monitoring/golfapp/
// graphify-ui/golfapp-preview are independently toggleable since each is optional on its own.
// golfapp-preview stays false until ATI-80 (per-PR image builds, a golf-ai-experiment CI
// change) lands - see docs/adr/golfapp-pr-preview-environments.md.
interface AddonToggles {
  platform: boolean;
  "coredns-lan": boolean;
  monitoring: boolean;
  golfapp: boolean;
  "graphify-ui": boolean;
  "golfapp-preview": boolean;
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
    const homelabConfig = new pulumi.Config("homelab");
    const domain = homelabConfig.require("domain");
    const addonToggles = homelabConfig.requireObject<AddonToggles>("addonToggles");
    const raspberrypiConfig = new pulumi.Config("raspberrypi");
    const nodeLanIp = raspberrypiConfig.require("nodeLanIp");
    const nodeLanIpV6 = raspberrypiConfig.require("nodeLanIpV6");

    const stackToggleLabels = Object.fromEntries(
      Object.entries(addonToggles).map(([name, enabled]) => [`${name}.stack.enabled`, String(enabled)]),
    );

    new k8s.core.v1.Secret(
      "argocd-in-cluster",
      {
        metadata: {
          name: "in-cluster",
          namespace: "argocd",
          labels: { "argocd.argoproj.io/secret-type": "cluster", ...stackToggleLabels },
          annotations: {
            addons_repo_url: gitRepoUrl,
            addons_repo_revision: gitRevision,
            addons_domain: domain,
            addons_node_ip: nodeLanIp,
            addons_node_ip_v6: nodeLanIpV6,
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
