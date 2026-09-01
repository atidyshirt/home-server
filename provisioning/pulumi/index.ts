import * as pulumi from "@pulumi/pulumi";
import { GatewayApi } from "./src/gatewayApi";
import { ArgoCd } from "./src/argocd";
import { GitopsBridge } from "./src/gitopsBridge";
import { OnePassword } from "./src/onePassword";

const gatewayApi = GatewayApi.install();
const argocd = ArgoCd.install();
// Depend on argocd.installed (just "the argocd namespace/CRDs exist"), not the whole `argocd`
// component - confirmed live as a from-scratch-bootstrap hang: depending on a ComponentResource
// waits for *every* child ever parented to it, including ones registered later in the program
// (root-app, from ArgoCd.init() below). Since root-app itself depends on gitopsBridge, depending
// on the whole component here is a real cycle - Pulumi doesn't error on it, it just never
// resolves, so argocd-in-cluster (and everything after it) never gets created.
const gitopsBridge = GitopsBridge.install({ dependsOn: argocd.installed });
const onePassword = OnePassword.install();

const rootApp = ArgoCd.init({ dependsOn: [gatewayApi, gitopsBridge, onePassword] });
// Must run after root-app: Dex/cert-manager are themselves GitOps-managed apps that root-app
// deploys, so their secrets don't exist until ArgoCD has actually synced them (see
// ArgoCd.configureDexIntegration's own comment for the from-scratch-rebuild failure this fixes).
ArgoCd.configureDexIntegration(rootApp);

const domain = new pulumi.Config("homelab").require("domain");
export const argocdUrl = `http://argo.${domain}`;
