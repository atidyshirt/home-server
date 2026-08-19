# Run an in-cluster CoreDNS addon for LAN DNS

## Status

Accepted

## Context

Devices on the LAN need to resolve `*.homelab.arpa` hostnames to the cluster's node IP, without
requiring every device to be manually configured with per-host entries, and without becoming a
single point of failure for the network's general internet DNS resolution.

## Decision

Run a CoreDNS addon (`coredns-lan`) in-cluster with `hostNetwork: true`, serving a wildcard
`*.homelab.arpa -> node IP` zone on port 53 of the Pi's own LAN interface. The router gets one
manual conditional-forwarding rule for just the `homelab.arpa` zone — this addon is never the
network's primary/only DNS server.

## Alternatives Considered

- **Router-native DNS entries** (static host records in the router's own DNS server, if it has
  one): rejected — most consumer routers either lack this feature entirely or require
  per-hostname manual entry with no wildcard support, unlike a wildcard CoreDNS zone.
- **Running this cluster's DNS as the network's sole/primary DNS server**: rejected — makes
  every device's internet access depend on this single Pi being up, for a benefit (LAN hostname
  resolution) that only needs conditional forwarding, not full DNS delegation.
- **Per-device `/etc/hosts` entries**: rejected — doesn't scale past a couple of devices, and
  breaks the moment a new service/subdomain is added.

## Consequences

- Adding a new `*.homelab.arpa` subdomain never requires touching the router or any device —
  the wildcard zone already covers it.
- `hostNetwork: true` means this addon can only ever run one replica per node (binds directly
  to the host's port 53) — not a concern on a single-node homelab, would need reconsidering on
  a multi-node cluster.
- Future improvement: if the cluster ever grows past one node, revisit whether `hostNetwork`
  DaemonSet-per-node or a different exposure mechanism (e.g. a `LoadBalancer` Service) is more
  appropriate.
