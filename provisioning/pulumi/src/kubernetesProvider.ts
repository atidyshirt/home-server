import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as command from "@pulumi/command";

export interface ApplyManifestOptions {
  namespace?: string;
  serverSide?: boolean;
  waitForCrd?: string;
  dependsOn?: pulumi.Resource | pulumi.Resource[];
  parent?: pulumi.Resource;
}

export interface RunCommandOptions {
  dependsOn?: pulumi.Resource | pulumi.Resource[];
  parent?: pulumi.Resource;
}

export interface KubernetesProvider {
  readonly ready: pulumi.Resource;
  readonly provider: k8s.Provider;
  applyManifest(name: string, manifestUrl: string, options?: ApplyManifestOptions): pulumi.Resource;
  // Arbitrary remote command, re-run after a full cluster rebuild the same way applyManifest's
  // commands are (see RaspberryPiK0s.rebuildTrigger) - for one-off waits/polls that don't fit
  // the "apply this one manifest" shape, e.g. waiting on a GitOps-managed Secret to exist.
  // Returns the actual command.remote.Command (not just pulumi.Resource) since callers
  // sometimes need its `.stdout` (e.g. reading a Secret's value via `kubectl get -o jsonpath`
  // instead of k8s.core.v1.Secret.get() - see ArgoCd.configureDexIntegrationInternal for why:
  // .get() reads execute immediately even during `pulumi preview`, ignoring dependsOn, so it
  // can't be used to defer a read until some other resource - a GitOps sync, here - is ready).
  runCommand(name: string, script: string, options?: RunCommandOptions): command.remote.Command;
}
