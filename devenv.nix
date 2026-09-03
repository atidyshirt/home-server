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
  # committer is inside `devenv shell` already. Plain `env VAR=... cmd` (no
  # `bash -c`) is fine here since nothing left for a shell to expand - prek
  # execs `entry`'s argv directly rather than through a shell, so a *literal*
  # `$SOMETHING` would never get substituted, but DOCKER_CONFIG below is a
  # fully-resolved nix store path with no shell variables in it.
  #
  # docker-credential-osxkeychain itself isn't nix-packageable portably (ships with
  # Docker Desktop, macOS-only) - `helm pull`'s OCI client shells out to whatever
  # `~/.docker/config.json`'s `credsStore` names, even for an anonymous public pull.
  # Point DOCKER_CONFIG at a credsStore-less config for the hook's duration instead
  # of trying to supply that binary.
  git-hooks.hooks.kubeconform = {
    enable = true;
    name = "kubeconform";
    description = "Validate rendered application manifests against Kubernetes/CRD schemas";
    entry = "${pkgs.coreutils}/bin/env DOCKER_CONFIG=\"${pkgs.writeTextDir "config.json" (builtins.toJSON { auths = { }; })}\" ${pkgs.devenv}/bin/devenv shell -- ${pkgs.bash}/bin/bash ${./scripts/validate-manifests.sh}";
    language = "system";
    pass_filenames = false;
  };
}
