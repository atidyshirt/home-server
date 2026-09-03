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
  # committer is inside `devenv shell`. Must go through `bash -c` (not exec `env`
  # directly) so `$PATH` is shell-expanded from the caller's inherited environment -
  # prek (unlike the original python pre-commit) execs `entry`'s argv directly for
  # `language = "system"` hooks, so a trailing literal `$PATH` passed straight to
  # `env` is never substituted and the caller's real PATH is silently dropped
  # (confirmed empirically: git/docker-credential-osxkeychain resolve fine
  # standalone but not via the installed hook, even from inside `devenv shell`).
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
    entry = "${pkgs.bash}/bin/bash -c 'PATH=\"${pkgs.git}/bin:${pkgs.kustomize}/bin:${pkgs.kubernetes-helm}/bin:${pkgs.kubeconform}/bin:$PATH\" DOCKER_CONFIG=\"${pkgs.writeTextDir "config.json" (builtins.toJSON { auths = { }; })}\" exec ${pkgs.bash}/bin/bash ${./scripts/validate-manifests.sh}'";
    language = "system";
    pass_filenames = false;
  };
}
