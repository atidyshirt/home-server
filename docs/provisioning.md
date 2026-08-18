# Provisioning

One-time bootstrap of the cluster via Pulumi. `devenv.nix` provides `pulumi`, `node`, `npm`, and `kubectl` — run `devenv shell` (or `direnv allow` if you use direnv) before the commands below.

## Bootstrap

```bash
devenv shell
cd provisioning/pulumi
npm install
pulumi login file://./state
pulumi stack init homelab
pulumi config set --secret onepassword:serviceAccountToken <your 1Password Service Account token>
PULUMI_CONFIG_PASSPHRASE=<your passphrase> pulumi up
```

> [!NOTE]
> Every other config value (`raspberrypi:*`, `argocd:*`, `gatewayapi:version`, `homelab:domain`) is already set in `Pulumi.homelab.yaml` — the 1Password Service Account token is the only one you provide. Config is namespaced per module and required, no code defaults — see [AGENT.md](../AGENT.md).

After that, ArgoCD owns everything under `addons/` and `applications/`.

## Manual steps

Router/network specific — can't be automated from here.

- **DHCP reservation**: reserve `192.168.1.146` for the Pi on your router. Both Traefik (hostNetwork, port 80) and the CoreDNS zone file assume this IP is stable.
- **DNS forwarding**: add a conditional-forwarding rule on your router for the `homelab.arpa` zone → `192.168.1.146`.
- **Trust the CA**: `*.homelab.arpa` is served with a self-signed cert (see [AGENT.md](../AGENT.md#tls)). Pull the CA's public cert out of the cluster and trust it in your OS/browser keychain — it's never the private key, so this is safe to do per-device:
  ```bash
  ssh clusteradmin@home-server.local "sudo k0s kubectl get secret homelab-ca-secret -n cert-manager -o jsonpath='{.data.ca\.crt}'" | base64 -d > homelab-ca.crt
  ```

> [!IMPORTANT]
> This is explicitly *not* setting it as the primary DNS server — only queries for `*.homelab.arpa` get forwarded there. If your router doesn't support conditional forwarding, set `192.168.1.146` as a secondary DNS server on individual devices instead.
