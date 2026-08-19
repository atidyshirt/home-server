# Use a standalone Dex instance for SSO, not ArgoCD's bundled sidecar

## Status

Accepted

## Context

ArgoCD needs SSO federated through Auth0, and other future apps on the cluster (Argo Workflows,
Argo Rollouts dashboard, etc.) will likely need the same OIDC identity, not a second/parallel
login system each.

## Decision

Dex runs as its own addon (`applications/dex/base`, own namespace, own `HTTPRoute`) rather than
using ArgoCD's bundled Dex sidecar. It federates Auth0 via Dex's generic `oidc` connector,
mapping Auth0's `https://homelab.arpa/roles` claim into Dex's own `groups` claim. ArgoCD's
`argocd-cm` points at Dex as an *external* OIDC provider (`oidc.config`, not `dex.config`).

## Alternatives Considered

- **ArgoCD's bundled Dex sidecar**: rejected — couples the identity broker's lifecycle and
  config to ArgoCD specifically; any other app wanting Auth0-backed SSO would need its own
  separate OIDC setup instead of registering as another Dex static client.
- **Point every app directly at Auth0**: rejected — means re-implementing Auth0's
  Roles-claim-to-groups-claim mapping (a Post-Login Action + Dex's `claimMapping`) in each app
  individually, rather than once in Dex.

## Consequences

- Any new app that needs SSO is a new Dex static client, not a new OIDC integration from
  scratch.
- One extra moving part (Dex itself) to keep running versus relying on ArgoCD's bundled
  version.
- `insecureEnableGroups: true` is required on Dex's OIDC connector or mapped groups are
  silently dropped regardless of `claimMapping` — confirmed empirically, not documented clearly
  upstream.
- Future improvement: register Argo Workflows' and Argo Rollouts' dashboards as additional Dex
  clients once their UIs are exposed (currently no `HTTPRoute` for either — see the ARC/Argo
  Workflows ADRs).
