import * as pulumi from "@pulumi/pulumi";
import { getKubernetesProvider } from "./raspberryPiK0s";

export class GatewayApi extends pulumi.ComponentResource {
  private static instance: GatewayApi | undefined;

  static install(): GatewayApi {
    if (!GatewayApi.instance) {
      GatewayApi.instance = new GatewayApi();
    }
    return GatewayApi.instance;
  }

  private constructor() {
    super("home-server:index:GatewayApi", "gateway-api");
    const k8sProvider = getKubernetesProvider();
    const version = new pulumi.Config("gatewayapi").get("version") ?? "v1.6.1";

    k8sProvider.applyManifest(
      "install-gateway-api-crds",
      `https://github.com/kubernetes-sigs/gateway-api/releases/download/${version}/standard-install.yaml`,
      { serverSide: true, parent: this },
    );

    this.registerOutputs({});
  }
}
