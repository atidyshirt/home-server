# Add a transient laptop worker node

## Status

Accepted

## Context

The cluster was a single k0s node (a Raspberry Pi), installed via `k0s install controller
--single`. The goal is to let a macOS laptop opportunistically join as a second, transient
worker — contributing compute while it's on and reachable over Tailscale, with workloads
shifting back to the Pi automatically when it disconnects.

`--single` permanently disables k0s's join API (port 9443) — confirmed against k0s docs and
[k0sproject/k0s#4122](https://github.com/k0sproject/k0s/issues/4122); no flag flip re-enables
it on a running cluster. Converting the storage backend underneath live data (sqlite/kine →
etcd) to unlock joining is explicitly called unsupported/risky by the k0s community.

macOS has no native kubelet/containerd — a worker needs a Linux VM. The laptop also roams
between networks, so whatever gives the VM's kubelet traffic a stable, Pi-reachable address has
to survive that roaming, the same problem the Pi's own Tailscale setup already solved via a
4via6 route instead of a plain LAN subnet route (see `docs/provisioning.md`).

Finally, `applications/argo-workflows/base/workflowtemplates/build-and-deploy.yaml`'s three
steps share one `ReadWriteOnce` PVC on k0s's default `local-path` StorageClass — node-local
storage. Once bound, the PV carries a hard node affinity to wherever the first step landed;
every later step (and any retry) is stuck on that node for the run's duration. Letting build
pods float to the laptop without fixing this would mean a disconnect mid-build permanently
strands that run rather than shifting it back to the Pi.

## Decision

- **Rebuild, don't migrate** the Pi: `k0s install controller --single` → `k0s install
  controller --enable-worker --no-taints`, then `pulumi up` reconstructs the cluster from git +
  1Password — the same path a fresh-Pi bootstrap already takes. Manual and user-run, not
  automated by Pulumi.
- **Laptop join is a standalone script** (`provisioning/laptop-worker/join.sh`/`leave.sh`), not
  a new Pulumi `ComponentResource`. Every existing module assumes a durable resource at a
  stable SSH target, reconciled forever; the laptop is off/roaming most of the time and has no
  stable address until after it joins. This matches the existing precedent of per-device manual
  steps (CA trust, Tailscale admin approval, Auth0 setup) living in `docs/provisioning.md` as
  plain shell commands.
- **The worker runs inside a Lima VM** (back from a brief detour through OrbStack — see
  Alternatives Considered), with `tailscaled` running inside the guest, not the macOS host. The
  requirement is the same regardless of which VM tool is used: the guest's kubelet/pod traffic
  needs its own distinct, Tailscale-routable node identity, not one collapsed into the host's
  own Tailscale IP via NAT. `limactl start` takes the same resource-limit knobs
  (`cpus`/`memory`/`disk`) as a plain YAML config, with a `provision.script` covering the same
  idempotent `tailscale`/`k0s`/`nfs-common` install this needs — see
  `provisioning/laptop-worker/lima.yaml`. `--node-ip` is pinned explicitly to the VM's Tailscale
  IP rather than auto-detected, which would follow whatever Wi-Fi is currently active.
- **A taint on the laptop node, tolerations on the two allowed workloads.** Every existing addon
  has zero node-placement config today (there's only ever been one node); the moment a second
  schedulable node exists, everything becomes schedulable there unless something stops it.
  `node-role.homelab/tier=transient:NoSchedule`, set via `--kubelet-extra-args` at
  `k0s install worker` time, makes "Pi-only by default" free for every current and future addon.
  Only ARC runner pods (`applications/arc-runners`) and Argo Workflows build pods
  (`applications/argo-workflows`) get the matching toleration. A same-named label rides along
  with the taint for observability/future affinity use.
- **Native Kubernetes eviction handles "shift back on disconnect"** — no custom join/leave
  daemon. Default `node-monitor-grace-period` (~40s) marks a disconnected laptop `NotReady`;
  default `tolerationSeconds` (300s) evicts its pods after that. ARC's runner-set controller
  replaces evicted runner pods on demand. A `retryStrategy` was added to
  `build-and-deploy.yaml`'s `build-and-push` step so a step killed by disconnect is retried
  rather than failing the whole run.
- **A new NFS-backed `workspace-nfs` StorageClass** (`applications/nfs-provisioner`, wrapping
  `nfs-subdir-external-provisioner`, pointed at a host-level NFS export on the Pi) replaces
  `local-path` for `build-and-deploy.yaml`'s shared workspace volume, so the workspace is no
  longer pinned to whichever node happened to run the first step.

## Alternatives Considered

- **In-place k0s conversion** (remove `--single`, migrate storage under live data): rejected —
  unsupported/risky per the k0s community; this repo's design already supports a clean rebuild
  from git + 1Password, at far lower risk.
- **Tailscale on the macOS host, VM routed through it**: rejected — the VM's own traffic would
  originate from a NAT'd address unreachable from the Pi; Tailscale has to originate inside the
  network namespace that needs to be reached.
- **OrbStack** (briefly swapped in for Lima, then reverted): tried to avoid maintaining a second
  virtualization stack, since the user already runs OrbStack for other (Docker) workflows.
  Reverted after OrbStack's own hypervisor VM was found to crash-loop on this Mac — repeated
  full boot cycles minutes apart (confirmed live via `~/.orbstack/log/vmgr.log`), triggered by
  continuous IPv6 STUN failures with no route to any of Tailscale's DERP relays (this Mac's
  Wi-Fi network provides no real IPv6 uplink at all). That instability meant kube-proxy/
  kube-router never got a long enough stable window to finish programming their netfilter
  rules, breaking cluster-DNS reachability for every pod scheduled on the node - not a
  capability or config issue, just never enough uptime. Lima uses macOS's
  Virtualization.framework directly, without OrbStack's Docker-optimized NAT/port-forwarding
  layer the crash-loop traced back to. Nothing about the underlying design (Tailscale-inside-
  guest, pinned `--node-ip`, taint/toleration scheme) changes across either tool.
- **Per-workload `nodeSelector` pinning every Pi-only addon**: rejected — doesn't generalize,
  and it's easy to forget one addon when a new one is added later. A taint makes "stay on the
  Pi" the default that costs nothing to maintain.
- **A custom join/leave daemon watching Tailscale status**: rejected — Kubernetes' own
  node-health/eviction machinery already does this, for free, without a new moving part to
  maintain.
- **Pulumi-managed laptop join**: rejected — fights Pulumi's "durable, reconciled-forever"
  model for something explicitly transient and opt-in per session.
- **Letting Argo Workflows build pods float without fixing storage**: rejected once the
  local-path node-pinning problem was found — would silently turn "shifts back to the Pi" into
  "gets permanently stuck," the opposite of the goal.

## Consequences

- The Pi rebuild is destructive to current cluster state by design (etcd replaces sqlite/kine;
  every addon and secret is reconstructed from git + 1Password) — not a live migration, and
  explicitly a manual, user-run step (see `docs/provisioning.md`).
- A build step killed mid-run by the laptop disconnecting is retried, not resumed — a small,
  acceptable delay (kaniko's own layer cache keeps a retry cheap), not silent data loss, now
  that the workspace volume is RWX and no longer node-pinned.
- NFS-over-Tailscale adds latency to the build workspace's I/O — acceptable for occasional CI
  use on a homelab, not something this addon is tuned for beyond that.
- The cluster's CNI MTU is lowered cluster-wide (`kuberouter.mtu: 1200`, `autoMTU: false`) to
  fit inside Tailscale's own tunnel MTU once a second node exists — a one-time change made at
  Pi-rebuild time, affecting the Pi's own node too, not just the laptop.
- `docs/adr/run-single-replica-eventbus-jetstream.md`'s "revisit if multi-node" note stays
  non-blocking here: the EventBus/argo-events control plane isn't tolerated onto the laptop and
  stays Pi-pinned, so its single-replica JetStream constraint is unaffected by this change.
- Adding a future third transient node reuses the same taint/toleration scheme and
  `provisioning/<node>/` script pattern — no new abstraction needed.
