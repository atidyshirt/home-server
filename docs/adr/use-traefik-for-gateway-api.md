# Use Traefik for the Gateway API implementation

## Status

Accepted

## Context

The cluster needs a Gateway API implementation to route HTTP(S) traffic to addons/apps, running
on a Raspberry Pi (aarch64).

## Decision

Use Traefik as the Gateway API implementation, running as root (uid 0, no capability
restrictions) to bind port 80/443 directly.

## Alternatives Considered

- **Envoy Gateway**: rejected — its bundled TCMalloc allocator assumes a 48-bit virtual address
  space and hard-crashes (`MmapAligned() failed`) on this Pi's aarch64 kernel, which appears to
  use a 39-bit VA space. This is a compile-time constant baked into the TCMalloc binary, not
  something fixable via Envoy configuration.
- **Non-root port binding via `NET_BIND_SERVICE` capability**: rejected for Traefik specifically
  — tried, failed to bind port 80 for reasons that traced to something below the Kubernetes API
  layer (kernel/container runtime level), not the manifest.
- **Non-root port binding via `allowPrivilegeEscalation`**: rejected — failed identically to
  the capability approach.

## Consequences

- Traefik runs with full root privileges in its pod — a larger privilege footprint than a
  properly non-root-capable ingress would have.
- Gains a working Gateway API implementation on aarch64 hardware where the more
  commonly-recommended option (Envoy Gateway) simply doesn't run.
- Future improvement: revisit non-root binding if a future k0s/containerd/kernel combination on
  this Pi resolves whatever the underlying capability issue was (never root-caused past "below
  the Kubernetes API").
