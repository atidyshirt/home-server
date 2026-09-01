import * as fs from "fs";
import * as path from "path";
import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";
import * as k8s from "@pulumi/kubernetes";
import { ApplyManifestOptions, KubernetesProvider } from "./kubernetesProvider";

interface RaspberryPiK0sArgs {
  sshHost: string;
  sshUser: string;
  nodeLanIp: string;
}

export class RaspberryPiK0s implements KubernetesProvider {
  readonly ready: pulumi.Resource;
  readonly provider: k8s.Provider;
  private readonly connection: command.types.input.remote.ConnectionArgs;
  // Proxy for "the cluster was rebuilt from scratch" - every applyManifest() command below
  // needs to re-run when this changes, not just when its own (static) `create` text does.
  // See get-kubeconfig's own `triggers` above for why: a full k0s reset leaves every
  // manifest-apply command believing it already succeeded against a cluster that no longer
  // has any of it, since none of their command text ever changes.
  private readonly rebuildTrigger: pulumi.Output<string>;

  constructor(args: RaspberryPiK0sArgs) {
    this.connection = { host: args.sshHost, user: args.sshUser };

    const ensureK0s = new command.remote.Command("ensure-k0s", {
      connection: this.connection,
      create: fs.readFileSync(path.join(__dirname, "..", "scripts", "ensure-k0s.sh"), "utf8"),
      // The script needs this to list both the LAN IP and its own live-fetched
      // Tailscale IP in the API server's cert SANs (see the script's own comment).
      environment: { NODE_LAN_IP: args.nodeLanIp },
    });

    const getKubeconfig = new command.remote.Command(
      "get-kubeconfig",
      {
        connection: this.connection,
        create: "sudo k0s kubeconfig admin",
        // `create`'s text never changes, so without this Pulumi treats the command as
        // unchanged even when ensure-k0s actually re-ran underneath it (e.g. a full
        // k0s reset generates a brand-new cluster CA) - stale cached kubeconfig then
        // fails TLS verification against the new cluster. Re-run whenever ensure-k0s's
        // own output changes, not just when this command's literal text does.
        triggers: [ensureK0s.stdout],
      },
      { dependsOn: ensureK0s },
    );

    const kubeconfig = getKubeconfig.stdout.apply((kc) =>
      kc.replace(/https:\/\/(localhost|127\.0\.0\.1):6443/, `https://${args.nodeLanIp}:6443`),
    );

    this.provider = new k8s.Provider("k0s", { kubeconfig });
    this.ready = getKubeconfig;
    this.rebuildTrigger = getKubeconfig.stdout;
  }

  applyManifest(name: string, manifestUrl: string, options: ApplyManifestOptions = {}): pulumi.Resource {
    const namespaceFlag = options.namespace ? `-n ${options.namespace} ` : "";
    const serverSideFlag = options.serverSide ? "--server-side --force-conflicts " : "";
    const waitCommand = options.waitForCrd
      ? ` && sudo k0s kubectl wait --for=condition=Established crd/${options.waitForCrd} --timeout=60s`
      : "";

    return new command.remote.Command(
      name,
      {
        connection: this.connection,
        create: `sudo k0s kubectl apply ${namespaceFlag}${serverSideFlag}-f ${manifestUrl}${waitCommand}`,
        triggers: [this.rebuildTrigger],
      },
      { dependsOn: options.dependsOn ?? this.ready, parent: options.parent },
    );
  }
}

let singleton: KubernetesProvider | undefined;

export function getKubernetesProvider(): KubernetesProvider {
  if (!singleton) {
    const config = new pulumi.Config("raspberrypi");
    singleton = new RaspberryPiK0s({
      sshHost: config.require("sshHost"),
      sshUser: config.require("sshUser"),
      nodeLanIp: config.require("nodeLanIp"),
    });
  }
  return singleton;
}
