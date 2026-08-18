{ pkgs, ... }:

{
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
