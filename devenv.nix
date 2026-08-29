{ pkgs, ... }:

{
  packages = [
    pkgs.pulumi-bin
    pkgs.kubectl
    pkgs.kustomize
    pkgs.kubernetes-helm
    pkgs.kubeconform
  ];

  languages.javascript = {
    enable = true;
    npm.enable = true;
  };

  languages.typescript.enable = true;

  # git commit runs the hook below with the caller's ambient PATH, not devenv's -
  # prepend these tools' nix store paths so it works whether or not the
  # committer is inside `devenv shell`.
  git-hooks.hooks.kubeconform = {
    enable = true;
    name = "kubeconform";
    description = "Validate rendered application manifests against Kubernetes/CRD schemas";
    entry = "${pkgs.coreutils}/bin/env PATH=\"${pkgs.kustomize}/bin:${pkgs.kubernetes-helm}/bin:${pkgs.kubeconform}/bin:$PATH\" ${pkgs.bash}/bin/bash ${./scripts/validate-manifests.sh}";
    language = "system";
    pass_filenames = false;
  };
}
