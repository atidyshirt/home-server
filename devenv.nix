{ pkgs, ... }:

{
  packages = [
    pkgs.pulumi-bin
    pkgs.kubectl
    pkgs.kustomize
    pkgs.kubernetes-helm
    pkgs.kubeconform
    pkgs.git
    pkgs.yq-go
  ];

  languages.javascript = {
    enable = true;
    npm.enable = true;
  };

  languages.typescript.enable = true;

  # git commit runs the hook below with the caller's ambient PATH, not devenv's.
  # Run it through `devenv shell --` so it gets the same environment as an
  # interactive devenv shell (everything in `packages` above, including git,
  # which kustomize needs to fetch remote CRDs) regardless of whether the
  # committer is inside `devenv shell` already.
  git-hooks.hooks.kubeconform = {
    enable = true;
    name = "kubeconform";
    description = "Validate rendered application manifests against Kubernetes/CRD schemas";
    entry = "${pkgs.devenv}/bin/devenv shell -- ${pkgs.bash}/bin/bash ${./scripts/validate-manifests.sh}";
    language = "system";
    pass_filenames = false;
  };
}
