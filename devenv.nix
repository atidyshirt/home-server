{ pkgs, ... }:

{
  # Pulumi CLI for the one-time bootstrap in provisioning/pulumi/, kubectl for
  # verifying the cluster afterward, kustomize+helm for testing addon manifests
  # locally before pushing (kustomize build --enable-helm, same as ArgoCD's
  # repo-server does).
  packages = [
    pkgs.pulumi-bin
    pkgs.kubectl
    pkgs.kustomize
    pkgs.kubernetes-helm
  ];

  languages.javascript = {
    enable = true;
    npm.enable = true;
  };

  languages.typescript.enable = true;
}
