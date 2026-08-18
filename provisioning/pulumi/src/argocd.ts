import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { KubernetesProvider } from "./kubernetesProvider";

export class ArgoCd {
  readonly namespace: k8s.core.v1.Namespace;
  readonly installed: pulumi.Resource;

  constructor(k8sProvider: KubernetesProvider, version: string) {
    this.namespace = new k8s.core.v1.Namespace(
      "argocd",
      { metadata: { name: "argocd" } },
      { provider: k8sProvider.provider },
    );

    this.installed = k8sProvider.applyManifest(
      "install-argocd",
      `https://raw.githubusercontent.com/argoproj/argo-cd/${version}/manifests/install.yaml`,
      {
        namespace: "argocd",
        serverSide: true,
        waitForCrd: "applications.argoproj.io",
        dependsOn: [k8sProvider.ready, this.namespace],
      },
    );

    new k8s.core.v1.ConfigMapPatch(
      "argocd-cm-kustomize-helm",
      {
        metadata: { name: "argocd-cm", namespace: "argocd" },
        data: { "kustomize.buildOptions": "--enable-helm" },
      },
      { provider: k8sProvider.provider, dependsOn: this.installed },
    );

    new k8s.core.v1.ConfigMapPatch(
      "argocd-cmd-params-cm-insecure",
      {
        metadata: { name: "argocd-cmd-params-cm", namespace: "argocd" },
        data: { "server.insecure": "true" },
      },
      { provider: k8sProvider.provider, dependsOn: this.installed },
    );
  }
}
