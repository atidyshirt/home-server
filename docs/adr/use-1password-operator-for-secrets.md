# Use the 1Password Kubernetes Operator as the sole secrets mechanism

## Status

Accepted

## Context

This is a public repo (`github.com/atidyshirt/home-server`) — no secret material can ever be
committed. Every addon that needs a credential (OIDC client secrets, API tokens, registry
credentials) needs a way to get it from a private store onto the cluster without a human
manually creating Kubernetes `Secret`s out-of-band (which git can't track or review).

## Decision

All credentials flow through the 1Password Kubernetes Operator via `OnePasswordItem` custom
resources — each one references an `itemPath` in a 1Password vault and the operator syncs it
into a same-named Kubernetes `Secret`. The only credential handled outside 1Password is the
operator's own Service Account token, created directly by Pulumi as a plain Kubernetes `Secret`
(never committed) — a deliberate exception, since the operator needs that token to bootstrap
its own access to 1Password in the first place.

## Alternatives Considered

- **HashiCorp Vault**: rejected — a whole additional stateful service to run, back up, and
  unseal on a single-node homelab, for the same net effect 1Password already provides.
- **Sealed Secrets (Bitnami)**: rejected — secret material still has to be encrypted and
  committed to git (even if only decryptable by the cluster), versus never touching git at all.
- **Manually created `Secret`s applied out-of-band**: rejected outright — no audit trail, no
  review, easy to lose track of which secrets exist where.

## Consequences

- Every new credential is a 1Password vault item + a small `OnePasswordItem` YAML file, fully
  git-reviewable without ever containing the secret value itself.
- The blast radius of the operator's own bootstrap token is real — if it's ever compromised, an
  attacker gets read access to whatever the underlying 1Password service account can see.
  Scoping that service account to exactly one vault (see `docs/provisioning.md`) is the
  mitigation.
- Future improvement: rotate the operator's own Service Account token periodically; there's no
  automation for that today, it's a manual Pulumi config update + `pulumi up`.
