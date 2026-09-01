# Advertise the API server via Tailscale, not the Pi's LAN IP

## Status

Accepted

## Context

Every Kubernetes cluster has a built-in `kubernetes` Service in the `default` namespace,
used by pods for in-cluster API access (client-go's default config, service account tokens,
any controller/sidecar that talks back to the API server). Unlike a normal Service, its
Endpoints aren't pod IPs - they're the API server's own advertised address
(`spec.api.address` in k0s's ClusterConfig, defaulting to the node's auto-detected LAN IP).

Once the transient laptop worker node existed (see
[add-transient-laptop-worker-node.md](add-transient-laptop-worker-node.md)), this became a
real problem: that node is only reachable over Tailscale, and the Pi deliberately never
advertises its LAN subnet over Tailscale (`docs/provisioning.md` - subnet-collision
avoidance, since `192.168.1.0/24` is the default range on most consumer routers). So the
`kubernetes` Service's Endpoints pointed at an address (`192.168.1.146:6443`) that pods on
the laptop worker fundamentally cannot route to.

Confirmed live: Argo Workflows' `wait` sidecar (which reports task results back to the API
server after every step) failed with `dial tcp 192.168.1.146:6443: i/o timeout` for every
step scheduled on that node - even when the step's actual work (e.g. a `git push` to bump
an image tag) succeeded, since that's an independent outbound call unaffected by this. The
workflow's own status still ended up `Failed`, not reflecting the real outcome.

This is a narrower but structurally similar problem to the one `build-trigger.homelab.arpa`
solved for ARC's notify webhook (see that HTTPRoute's own commit) - both trace back to the
laptop worker node not being able to route to the Pi's LAN subnet - but the `kubernetes`
Service can't be worked around the same way (routing around a Service that every pod
implicitly depends on via `KUBERNETES_SERVICE_HOST` isn't practical the way rerouting one
webhook URL was).

## Decision

- **Set `spec.api.address` to the Pi's own Tailscale IP**, fetched live via `tailscale ip -4`
  in `provisioning/pulumi/scripts/ensure-k0s.sh` at k0s-install time (not hardcoded - see
  the same reasoning in `provisioning/laptop-worker/join.sh` for why this is fetched live
  rather than pinned in a config value that could go stale if the Pi's Tailscale identity
  ever resets). This becomes the default embedded in the `kubernetes` Service's Endpoints
  and in freshly-minted worker join tokens.
- **`spec.api.address` only changes what's *advertised*, not what the server *binds* to** -
  the API server still listens on all its interfaces regardless (confirmed: the Pi's
  existing LAN-IP-based access - Pulumi's own kubeconfig, this repo's documented SSH-based
  `k0s kubectl` commands, any operator's personal `~/.kube/config` - keeps working exactly
  as before). Only the *default*, used when nothing else specifies an address, changes.
- **Both the LAN IP and the Tailscale IP go into `spec.api.sans`** explicitly, so the
  server's certificate stays valid for both access paths regardless of which one is
  "advertised" by default.
- **Tailscale on the Pi moves from a post-bootstrap manual step to a prerequisite** of
  `pulumi up` (`docs/provisioning.md`) - `ensure-k0s.sh` now depends on `tailscale ip -4`
  already returning a value, which it can't if Tailscale isn't up yet.
- **This requires a full cluster rebuild to take effect** (`spec.api.address` isn't
  something you flip on a live cluster without disruption) - accepted, since this repo's
  design already treats "rebuild from git + 1Password" as the normal recovery/change path
  for control-plane-level config, not something to avoid.

## Alternatives Considered

- **Route around it per-workload** (the `build-trigger.homelab.arpa` HTTPRoute approach):
  rejected for this specific case - the `kubernetes` Service is an implicit dependency of
  nearly everything (any pod using its service account token, any controller/sidecar
  reporting status), not one call site you can point at a different URL. Fixing the
  advertised address once is more work up front but doesn't need to be repeated for every
  future thing that happens to need in-cluster API access from that node.
- **Fix kube-router's cross-node BGP/pod-overlay routing instead**: investigated and
  rejected as the fix for *this* problem specifically - even a fully working pod-to-pod
  overlay wouldn't help, since `192.168.1.146:6443` is a host-level LAN address, not a pod
  IP within either node's pod CIDR. Kube-router's mesh only ever covers pod-to-pod traffic.
  (The underlying BGP-mesh gap is still real and still open for actual pod-to-pod
  cross-node traffic - just orthogonal to this specific fix.)
- **Enable IPv6 for pods and use the existing 4via6 AAAA record**: rejected - kube-router
  runs with `--enable-ipv6=false` cluster-wide; flipping that on is a much larger, riskier
  change than adjusting one advertise-address field, for a cluster that's already shown
  itself to be fragile under less invasive changes this session.
- **Leave it broken, treat Argo's status reporting as cosmetically unreliable on that
  node**: rejected once realized this isn't cosmetic - it's *any* pod's in-cluster API
  access on that node, not just this one Argo sidecar's status bookkeeping.

## Consequences

- Freshly-minted worker join tokens (`k0s token create --role=worker`) now embed the
  Tailscale IP directly, matching what `provisioning/laptop-worker/join.sh` already
  rewrites them to by hand. That rewrite step is now redundant (a no-op, replacing the
  Tailscale IP with itself) but harmless to leave in place - not removed here, since this
  ADR is scoped to the advertise-address change, not a join.sh cleanup pass.
- Every pod's in-cluster API access now transits the Pi's own `tailscale0` interface, even
  for pods running on the Pi itself (a same-machine loopback-style path rather than a
  direct LAN-local one). No observed issue with this, but it's a real change in the
  network path for the single most common kind of in-cluster traffic in the whole cluster.
- Requires a full `k0s reset` + `pulumi up` rebuild to take effect, per the Decision above -
  not a rolling/zero-downtime change.
