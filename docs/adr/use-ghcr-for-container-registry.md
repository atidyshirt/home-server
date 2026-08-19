# Use GHCR, not a self-hosted registry

## Status

Accepted

## Context

The build-and-deploy pipeline needs somewhere to push built container images to, that Argo
Rollouts can then pull from when deploying.

## Decision

Use GHCR (`ghcr.io`) as the container registry for every project built through this pipeline.

## Alternatives Considered

- **A self-hosted registry addon** (e.g. `distribution/distribution` or Harbor, running
  in-cluster): rejected — would need a PVC for storage, a cert-manager-issued TLS cert, an
  `HTTPRoute`, and its own auth/credential management, all for a homelab where GitHub-hosted
  auth and storage are already available for free.

## Consequences

- Image pushes/pulls depend on GHCR being reachable — a homelab-external dependency, versus a
  self-hosted registry that would work even if the internet connection dropped.
- No registry storage, backup, or TLS to manage on the cluster.
- Credentials are a single GitHub PAT (`write:packages`) synced via the existing 1Password
  operator pattern, not a new auth system.
- Future improvement: if working fully offline ever becomes a requirement, revisit a
  self-hosted registry — not currently a need.
