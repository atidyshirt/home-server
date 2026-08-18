{ pkgs, ... }:

{
  # Pulumi CLI for the one-time bootstrap in provisioning/pulumi/, plus kubectl for
  # verifying the cluster afterward.
  packages = [
    pkgs.pulumi-bin
    pkgs.kubectl
  ];

  languages.javascript = {
    enable = true;
    npm.enable = true;
  };

  languages.typescript.enable = true;
}
