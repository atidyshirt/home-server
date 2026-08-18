# Kubernetes on a Raspberry Pi (k0s)

Single-node k0s cluster running on a Raspberry Pi (Debian 13, aarch64).

## Access

```bash
ssh clusteradmin@home-server.local
sudo k0s kubectl get nodes
```

## Why k0s

Minimal single-binary Kubernetes distribution — no separate control-plane/worker split needed
for a single Pi. Provisioning is deliberately isolated behind a `KubernetesProvider` interface
(`provisioning/pulumi/src/kubernetesProvider.ts`, implemented by `raspberryPiK0s.ts`), so
switching to a different distribution later (k3s, RKE2, ...) only touches that one file — see
[AGENT.md](../AGENT.md) for the full module breakdown.

## Known quirks

> [!WARNING]
> **39-bit virtual address space.** This Pi's aarch64 kernel breaks anything using Google's
> TCMalloc allocator, which assumes 48-bit — a compile-time constant, not fixable via config.
> This is why the Gateway API implementation is Traefik (Go, no TCMalloc) rather than Envoy
> Gateway. See `AGENT.md`'s Gateway API section for the full diagnosis.

> [!WARNING]
> **Port 8080 is taken.** kube-router's metrics endpoint owns it on the host. Anything using
> `hostNetwork: true` needs to pick a different port for its own internal
> API/dashboard/metrics entrypoint (see Traefik's `ports.traefik.port` override).

- **hostNetwork rollouts on a single node**: a `Deployment`'s default `RollingUpdate` tries to
  schedule the new pod before tearing down the old one — impossible when both want the same
  host port on the only node. Anything hostNetwork'd should be a `DaemonSet` with
  `updateStrategy.rollingUpdate: { maxUnavailable: 1, maxSurge: 0 }`.
