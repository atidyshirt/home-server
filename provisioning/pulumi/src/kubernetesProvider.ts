import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

export interface ApplyManifestOptions {
  namespace?: string;
  serverSide?: boolean;
  waitForCrd?: string;
  dependsOn?: pulumi.Resource | pulumi.Resource[];
  parent?: pulumi.Resource;
}

export interface KubernetesProvider {
  readonly ready: pulumi.Resource;
  readonly provider: k8s.Provider;
  applyManifest(name: string, manifestUrl: string, options?: ApplyManifestOptions): pulumi.Resource;
}
