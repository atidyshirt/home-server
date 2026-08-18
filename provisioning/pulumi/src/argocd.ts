import * as fs from "fs";
import * as path from "path";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { getKubernetesProvider } from "./raspberryPiK0s";

const REPO_ROOT = path.join(__dirname, "..", "..", "..");

export interface ArgoCdInitOptions {
  dependsOn: pulumi.Resource | pulumi.Resource[];
}

export class ArgoCd extends pulumi.ComponentResource {
  private static instance: ArgoCd | undefined;
  private readonly k8sProvider = getKubernetesProvider();

  static install(): ArgoCd {
    if (!ArgoCd.instance) {
      ArgoCd.instance = new ArgoCd();
    }
    return ArgoCd.instance;
  }

  static init(options: ArgoCdInitOptions): pulumi.Resource {
    return ArgoCd.install().applyRootApp(options.dependsOn);
  }

  private constructor() {
    super("home-server:index:ArgoCd", "argocd");
    const version = new pulumi.Config("argocd").require("version");

    const namespace = new k8s.core.v1.Namespace(
      "argocd",
      { metadata: { name: "argocd" } },
      { provider: this.k8sProvider.provider, parent: this, protect: true },
    );

    const installed = this.k8sProvider.applyManifest(
      "install-argocd",
      `https://raw.githubusercontent.com/argoproj/argo-cd/${version}/manifests/install.yaml`,
      {
        namespace: "argocd",
        serverSide: true,
        waitForCrd: "applications.argoproj.io",
        dependsOn: [this.k8sProvider.ready, namespace],
        parent: this,
      },
    );

    new k8s.core.v1.ConfigMapPatch(
      "argocd-cm-kustomize-helm",
      {
        metadata: { name: "argocd-cm", namespace: "argocd" },
        data: { "kustomize.buildOptions": "--enable-helm" },
      },
      { provider: this.k8sProvider.provider, dependsOn: installed, parent: this },
    );

    new k8s.core.v1.ConfigMapPatch(
      "argocd-cmd-params-cm-insecure",
      {
        metadata: { name: "argocd-cmd-params-cm", namespace: "argocd" },
        data: { "server.insecure": "true" },
      },
      { provider: this.k8sProvider.provider, dependsOn: installed, parent: this },
    );
  }

  private applyRootApp(dependsOn: pulumi.Resource | pulumi.Resource[]): pulumi.Resource {
    const argocdConfig = new pulumi.Config("argocd");
    const gitRepoUrl = argocdConfig.require("gitRepoUrl");
    const gitRevision = argocdConfig.require("gitRevision");
    const domain = new pulumi.Config("homelab").require("domain");

    const rootAppYaml = fs
      .readFileSync(path.join(REPO_ROOT, "bootstrap/argocd/root-app.yaml"), "utf8")
      .replace("repoURL: __GIT_REPO_URL__", `repoURL: ${gitRepoUrl}`)
      .replace("targetRevision: __GIT_REVISION__", `targetRevision: ${gitRevision}`);

    const rootApp = new k8s.yaml.ConfigGroup(
      "root-app",
      { yaml: rootAppYaml },
      { provider: this.k8sProvider.provider, dependsOn, parent: this },
    );

    const httprouteYaml = fs
      .readFileSync(path.join(REPO_ROOT, "bootstrap/argocd/httproute.yaml"), "utf8")
      .replace("__DOMAIN__", domain);

    new k8s.yaml.ConfigGroup(
      "argocd-httproute",
      { yaml: httprouteYaml },
      { provider: this.k8sProvider.provider, dependsOn, parent: this },
    );

    this.registerOutputs({});

    return rootApp;
  }
}
