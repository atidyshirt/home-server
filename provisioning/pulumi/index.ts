import * as pulumi from "@pulumi/pulumi";
import { GatewayApi } from "./src/gatewayApi";
import { ArgoCd } from "./src/argocd";
import { GitopsBridge } from "./src/gitopsBridge";
import { OnePassword } from "./src/onePassword";

const gatewayApi = GatewayApi.install();
const argocd = ArgoCd.install();
const gitopsBridge = GitopsBridge.install({ dependsOn: argocd });
const onePassword = OnePassword.install();

ArgoCd.init({ dependsOn: [gatewayApi, gitopsBridge, onePassword] });

const domain = new pulumi.Config("homelab").require("domain");
export const argocdUrl = `http://argo.${domain}`;
