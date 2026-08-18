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

  constructor(args: RaspberryPiK0sArgs) {
    this.connection = { host: args.sshHost, user: args.sshUser };

    const ensureK0s = new command.remote.Command("ensure-k0s", {
      connection: this.connection,
      create: fs.readFileSync(path.join(__dirname, "..", "scripts", "ensure-k0s.sh"), "utf8"),
    });

    const getKubeconfig = new command.remote.Command(
      "get-kubeconfig",
      {
        connection: this.connection,
        create: "sudo k0s kubeconfig admin",
      },
      { dependsOn: ensureK0s },
    );

    const kubeconfig = getKubeconfig.stdout.apply((kc) =>
      kc.replace(/https:\/\/(localhost|127\.0\.0\.1):6443/, `https://${args.nodeLanIp}:6443`),
    );

    this.provider = new k8s.Provider("k0s", { kubeconfig });
    this.ready = getKubeconfig;
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
