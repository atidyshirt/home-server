# home-server

GitOps repo for the homelab k0s cluster. See `AGENT.md` for the architecture summary.

## One-time bootstrap

`devenv.nix` provides `pulumi`, `node`, `npm`, and `kubectl` — run `devenv shell` (or
`direnv allow` if you use direnv) before the commands below.

```
devenv shell
cd provisioning/pulumi
npm install
pulumi login file://./state
pulumi stack init homelab
pulumi config set --secret onepassword:serviceAccountToken <your 1Password Service Account token>
PULUMI_CONFIG_PASSPHRASE=<your passphrase> pulumi up
```

`raspberrypi:sshHost`, `raspberrypi:sshUser`, and `raspberrypi:nodeLanIp` are already set in
`Pulumi.homelab.yaml`. Config is namespaced per module — see `AGENT.md`.

After that, ArgoCD owns everything under `addons/` and `applications/` — see `AGENT.md`.

## Testing a PR branch

By default every addon deploys from `main`. To point the whole tree at a branch instead
(e.g. to test a PR before merging):

```
pulumi config set gitRevision <branch-name>
PULUMI_CONFIG_PASSPHRASE=<your passphrase> pulumi up
```

Switch back with `pulumi config set gitRevision main` (or `pulumi config rm gitRevision`,
same effect — it's the default).

## Manual steps (not automated, router/network specific)

- **DHCP reservation**: reserve `192.168.1.146` for the Pi on your router. Both Traefik
  (hostNetwork, port 80) and the CoreDNS zone file assume this IP is stable.
- **DNS forwarding**: add a conditional-forwarding rule on your router for the `homelab.dev`
  zone → `192.168.1.146`. This is explicitly *not* setting it as the primary DNS server —
  only queries for `*.homelab.dev` get forwarded there. If your router doesn't support
  conditional forwarding, set `192.168.1.146` as a secondary DNS server on individual
  devices instead.

## Adding a new app

Add `applications/<name>/base/kustomization.yaml` (+ an `HTTPRoute` for
`<name>.homelab.dev`) and push. `addon-applications-appset.yaml` picks it up automatically —
no new DNS record needed (wildcard).
