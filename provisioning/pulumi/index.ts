import * as fs from "fs";
import * as path from "path";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { RaspberryPiK0s } from "./src/raspberryPiK0s";
import { ArgoCd } from "./src/argocd";
import { GitopsBridge } from "./src/gitopsBridge";

const config = new pulumi.Config();
const sshHost = config.require("sshHost");
const sshUser = config.require("sshUser");
const nodeLanIp = config.require("nodeLanIp");
const opServiceAccountToken = config.requireSecret("opServiceAccountToken");
const gitRevision = config.get("gitRevision") || "main";

const gatewayApiVersion = "v1.6.1";
const argocdVersion = "v3.5.1";
const gitRepoUrl = "https://github.com/atidyshirt/home-server.git";

const k0s = new RaspberryPiK0s({ sshHost, sshUser, nodeLanIp });

const gatewayApiCrds = k0s.applyManifest(
  "install-gateway-api-crds",
  `https://github.com/kubernetes-sigs/gateway-api/releases/download/${gatewayApiVersion}/standard-install.yaml`,
  { serverSide: true },
);

const argocd = new ArgoCd(k0s, argocdVersion);

const gitopsBridge = new GitopsBridge(k0s, {
  repoUrl: gitRepoUrl,
  revision: gitRevision,
  dependsOn: argocd.installed,
});

const onepasswordNamespace = new k8s.core.v1.Namespace(
  "onepassword",
  { metadata: { name: "onepassword" } },
  { provider: k0s.provider },
);

const onepasswordServiceAccountSecret = new k8s.core.v1.Secret(
  "onepassword-service-account-token",
  {
    metadata: { name: "onepassword-service-account-token", namespace: "onepassword" },
    stringData: { token: opServiceAccountToken },
  },
  { provider: k0s.provider, dependsOn: onepasswordNamespace },
);

const repoRoot = path.join(__dirname, "..", "..");

const rootAppYaml = fs
  .readFileSync(path.join(repoRoot, "bootstrap/argocd/root-app.yaml"), "utf8")
  .replace("repoURL: https://github.com/atidyshirt/home-server.git", `repoURL: ${gitRepoUrl}`)
  .replace("targetRevision: main", `targetRevision: ${gitRevision}`);

const rootApp = new k8s.yaml.ConfigGroup(
  "root-app",
  { yaml: rootAppYaml },
  {
    provider: k0s.provider,
    dependsOn: [
      gatewayApiCrds,
      argocd.installed,
      gitopsBridge.clusterSecret,
      onepasswordServiceAccountSecret,
    ],
  },
);

const argocdHttpRoute = new k8s.yaml.ConfigFile(
  "argocd-httproute",
  { file: path.join(repoRoot, "bootstrap/argocd/httproute.yaml") },
  { provider: k0s.provider, dependsOn: [gatewayApiCrds, argocd.installed] },
);

export const argocdUrl = "http://argo.homelab.dev";
