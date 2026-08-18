# home-server

GitOps repo for the homelab k0s cluster. See `AGENT.md` for the architecture summary.

## One-time bootstrap

```
cd provisioning/pulumi
npm install
pulumi login file://./state
pulumi stack init homelab
pulumi config set sshHost home-server.local
pulumi config set sshUser clusteradmin
pulumi config set nodeLanIp 192.168.1.146
pulumi config set gitRepoUrl https://github.com/atidyshirt/home-server.git
pulumi config set --secret opServiceAccountToken <your 1Password Service Account token>
PULUMI_CONFIG_PASSPHRASE=<your passphrase> pulumi up
```

After that, ArgoCD owns everything under `addons/` and `applications/` — see `AGENT.md`.

## Manual steps (not automated, router/network specific)

- **DHCP reservation**: reserve `192.168.1.146` for the Pi on your router. Both the Envoy
  Gateway (hostNetwork, port 80) and the CoreDNS zone file assume this IP is stable.
- **DNS forwarding**: add a conditional-forwarding rule on your router for the `homelab.dev`
  zone → `192.168.1.146`. This is explicitly *not* setting it as the primary DNS server —
  only queries for `*.homelab.dev` get forwarded there. If your router doesn't support
  conditional forwarding, set `192.168.1.146` as a secondary DNS server on individual
  devices instead.

## Adding a new app

Add `applications/<name>/base/kustomization.yaml` (+ an `HTTPRoute` for
`<name>.homelab.dev`) and push. `addon-applications-appset.yaml` picks it up automatically —
no new DNS record needed (wildcard).
