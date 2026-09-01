# Provisioning

One-time bootstrap of the cluster via Pulumi. `devenv.nix` provides `pulumi`, `node`, `npm`, and `kubectl` — run `devenv shell` (or `direnv allow` if you use direnv) before the commands below.

## Prerequisite: Tailscale on the Pi

Installed on the Pi itself, not the cluster - but `pulumi up` now depends on it (see
below), so this has to happen *before* Bootstrap, not after.

```bash
ssh clusteradmin@home-server.local "curl -fsSL https://tailscale.com/install.sh | sh"
ssh clusteradmin@home-server.local "echo 'net.ipv4.ip_forward = 1' | sudo tee /etc/sysctl.d/99-tailscale.conf && echo 'net.ipv6.conf.all.forwarding = 1' | sudo tee -a /etc/sysctl.d/99-tailscale.conf && sudo sysctl -p /etc/sysctl.d/99-tailscale.conf"
ssh clusteradmin@home-server.local "sudo tailscale up --accept-dns=false"
```

`tailscale up` prints a login URL on first run (no auth key used here) — open it to authorize the Pi's machine in your tailnet. `--accept-dns=false` stops MagicDNS from rewriting the Pi's own system resolver; coredns-lan's hostNetwork listener on port 53 is unaffected either way, this just avoids the Pi's own outbound traffic resolving through Tailscale instead of your router.

A plain `--advertise-routes=192.168.1.0/24` subnet route was tried first and dropped: any client physically connected to *another* network that also happens to use `192.168.1.0/24` (extremely common — it's the default on most consumer routers) will route traffic for `192.168.1.146` onto that foreign network instead of through Tailscale, since an on-link route always wins over a same-prefix-length tunnel route. Same failure mode hits the DNS *answer* too, since the wildcard zone record is a hardcoded IPv4 literal.

Instead the Pi advertises a single-host route via [4via6](https://tailscale.com/kb/1201/4via6-subnets) — mapping just `192.168.1.146/32` into a Tailscale-unique IPv6 address, which can never collide with any physical network's addressing:
```bash
ssh clusteradmin@home-server.local "tailscale debug via 1 192.168.1.146/32"
# -> fd7a:115c:a1e0:b1a:0:1:c0a8:192/128
ssh clusteradmin@home-server.local "sudo tailscale set --advertise-routes=fd7a:115c:a1e0:b1a:0:1:c0a8:192/128"
```
`1` is an arbitrary site ID (only matters if you ever add a second subnet router — must be unique across the tailnet). The resulting `/128` is deterministic from the site ID + IPv4 address, and is wired into `raspberrypi:nodeLanIpV6` (`Pulumi.homelab.yaml`) → `addons_node_ip_v6` → an `AAAA` record alongside the existing `A` record in coredns-lan's zone (see `applications/coredns-lan/base`). Browsers try the `AAAA` first and fall back to the `A` record (Happy Eyeballs), so LAN clients keep working exactly as before, and tailnet clients on any network reach it via the collision-proof IPv6 path.

Then in the [Tailscale admin console](https://login.tailscale.com/admin/machines): approve the advertised `/128` route on the Pi's machine (subnet routes require manual approval), and under **DNS → Split DNS**, add a nameserver for the `homelab.arpa` domain pointing at the Pi's own Tailscale IP (`tailscale ip -4` on the Pi) — not its LAN IP, for the same collision reason above. The Pi's own Tailscale IP needs no route/approval to reach; it's directly addressable between any two tailnet nodes. Trust the CA (below) on each tailnet device too — Tailscale carries the traffic, but TLS trust is still per-device.

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

> [!NOTE]
> `ensure-k0s.sh` (run as part of this step) calls `tailscale ip -4` on the Pi to set the API server's advertise address and cert SANs - this is why Tailscale has to be up on the Pi *before* this step, not after. See `docs/adr/advertise-api-server-via-tailscale.md`.

After that, ArgoCD owns everything under `addons/` and `applications/`.

## Manual steps

Router/network/IdP-dashboard specific — can't be automated from here.

- **DHCP reservation**: reserve `192.168.1.146` for the Pi on your router. Both Traefik (hostNetwork, port 80) and the CoreDNS zone file assume this IP is stable.
- **DNS forwarding**: add a conditional-forwarding rule on your router for the `homelab.arpa` zone → `192.168.1.146`.
- **Trust the CA**: `*.homelab.arpa` is served with a self-signed cert (see [AGENT.md](../AGENT.md#tls)). Pull the CA's public cert out of the cluster and trust it in your OS/browser keychain — it's never the private key, so this is safe to do per-device:
  ```bash
  ssh clusteradmin@home-server.local "sudo k0s kubectl get secret homelab-ca-secret -n cert-manager -o jsonpath='{.data.ca\.crt}'" | base64 -d > homelab-ca.crt
  ```
- **Auth0 setup** (see [AGENT.md](../AGENT.md#sso--oidc)): create an Auth0 Application, add `https://dex.homelab.arpa/callback` to its Allowed Callback URLs, create `homelab:admin`/`homelab:user` Roles and assign them to users, and attach a Post-Login Action to the Login flow that adds them as a `https://homelab.arpa/roles` custom claim:
  ```js
  exports.onExecutePostLogin = async (event, api) => {
    const namespace = 'https://homelab.arpa';
    if (event.authorization) {
      api.idToken.setCustomClaim(`${namespace}/roles`, event.authorization.roles);
      api.accessToken.setCustomClaim(`${namespace}/roles`, event.authorization.roles);
    }
  };
  ```

## Adding a transient laptop worker node

See [docs/adr/add-transient-laptop-worker-node.md](adr/add-transient-laptop-worker-node.md) for
the full design. Three one-time steps, in order:

### 1. Rebuild the Pi (single → multi-node)

`k0s install controller --single` can never accept a worker join (see the ADR) — this replaces
the whole cluster from git + 1Password, the same way a fresh-Pi bootstrap works today. Not a
live migration: everything is reconstructed, nothing is preserved in place.

```bash
ssh clusteradmin@home-server.local "sudo k0s stop && sudo k0s reset"
cd provisioning/pulumi
PULUMI_CONFIG_PASSPHRASE=<your passphrase> pulumi up
```

Verify: `ssh clusteradmin@home-server.local "sudo k0s kubectl get nodes"` shows one `Ready`
node, and ArgoCD has synced every addon (including the new `nfs-provisioner`).

### 2. NFS export for the shared build workspace

`applications/nfs-provisioner` needs an NFS server to point at — this runs at the host level on
the Pi, the same pattern as Tailscale/CA-trust above, rather than as an in-cluster server pod.

```bash
ssh clusteradmin@home-server.local "sudo apt-get install -y nfs-kernel-server && sudo mkdir -p /srv/nfs/homelab-workspace"
ssh clusteradmin@home-server.local "echo '/srv/nfs/homelab-workspace 10.244.0.0/16(rw,sync,no_subtree_check,no_root_squash)' | sudo tee -a /etc/exports && sudo exportfs -ra"
```

`10.244.0.0/16` is k0s's default pod CIDR (kube-router) — confirm it matches post-rebuild
(`sudo k0s kubectl cluster-info dump | grep -m1 cluster-cidr`) before relying on it, since a
custom CIDR would need the export range adjusted to match.

### 3. Laptop worker join

Requires [Lima](https://lima-vm.io) (installed via the dotfiles' nix packages - see
`users/jordanp/packages.nix` in the dotfiles repo) on the laptop. Not OrbStack: its own
hypervisor VM was found to crash-loop on this Mac (see the ADR's Alternatives Considered),
breaking cluster-DNS reachability for anything scheduled on it.

```bash
provisioning/laptop-worker/join.sh
```

Starts a Linux VM, brings up Tailscale inside it (opens a login URL on first run, same as the
Pi's own Tailscale step above), mints a k0s worker join token from the Pi, and joins the VM as
a tainted (`node-role.homelab/tier=transient`), laptop-only-eligible worker
node. Verify:
`ssh clusteradmin@home-server.local "sudo k0s kubectl get nodes"` shows two nodes.

`provisioning/laptop-worker/leave.sh` stops the VM (add `--delete` to fully remove it) — a
stopped VM alone is enough to trigger `NotReady` → eviction, no explicit decommissioning step
needed for routine disconnects.

> [!IMPORTANT]
> The DNS forwarding rule is explicitly *not* setting it as the primary DNS server — only queries for `*.homelab.arpa` get forwarded there. If your router doesn't support conditional forwarding, set `192.168.1.146` as a secondary DNS server on individual devices instead.

> [!WARNING]
> Logging in via a different Auth0 connection (e.g. Google) than the one your Roles are assigned to creates a separate Auth0 user with no roles, and ArgoCD will show zero applications — not a bug, just a different identity underneath.
