# Shell out to k0s kubectl over SSH instead of @pulumi/kubernetes YAML resources

## Status

Accepted

## Context

`KubernetesProvider.applyManifest()` needs to apply arbitrary, sometimes very large, YAML
manifests (e.g. ArgoCD's full `install.yaml`) to the cluster during provisioning.

## Decision

`RaspberryPiK0s.applyManifest()` shells out over SSH to `k0s kubectl apply` rather than using
`@pulumi/kubernetes`'s own YAML resource types (`ConfigGroup`/`ConfigFile`).
`ArgoCd`/`GitopsBridge`/`OnePassword`/`GatewayApi` are all written against the
`KubernetesProvider` interface, not this implementation directly.

## Alternatives Considered

- **`@pulumi/kubernetes`'s `ConfigGroup`/`ConfigFile` YAML resources**: rejected — large
  manifests were silently dropped through them (no error, resources simply didn't get created),
  confirmed empirically against ArgoCD's install manifest specifically.
- **`@pulumi/kubernetes` typed resources per object** (one Pulumi resource per Kubernetes
  object in the manifest): rejected for third-party manifests like ArgoCD's — would mean
  hand-transcribing and maintaining a large upstream manifest as Pulumi code, fighting upstream
  releases every time it changes.

## Consequences

- Provisioning depends on SSH access to the Pi and a working `k0s kubectl` on the other end,
  rather than only the Kubernetes API being reachable from wherever Pulumi runs.
- Any manifest, of any size or shape, can be applied uniformly — no per-resource Pulumi typing
  needed for third-party installs.
- The `KubernetesProvider` interface seam means swapping this implementation (e.g. for a
  non-SSH-reachable cluster, or a cluster where direct API access is preferred) doesn't require
  changing any of the four modules built against it.
- Future improvement: investigate whether newer `@pulumi/kubernetes` versions still drop large
  manifests via `ConfigGroup` — if that's been fixed upstream, this could potentially move back
  to direct API access and drop the SSH dependency.
