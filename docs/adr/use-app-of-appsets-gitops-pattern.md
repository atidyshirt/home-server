# Use an app-of-appsets GitOps pattern, one ApplicationSet per namespace

## Status

Accepted

## Context

ArgoCD needs a way to discover and manage every addon in this repo without a human running
`kubectl apply`/`argocd app create` per addon, while keeping each addon's blast radius
predictable — one misconfigured addon shouldn't be able to touch another addon's namespace.

## Decision

A single root `Application` ("app of appsets") scans `addons/addon-*-appset.yaml` via a
directory generator (non-recursive, explicit `include` glob) and applies whatever
`ApplicationSet`s it finds. Every `ApplicationSet` targets exactly one namespace and belongs to
an `AppProject` whose `destinations` whitelist only that namespace — enforced by the
`AppProject`, not just convention.

## Alternatives Considered

- **A single monolithic `Application`** covering all addons: rejected — one addon's manifest
  error would block sync for everything, and there'd be no per-addon RBAC boundary.
- **Auto-discovery generator** (e.g. a Git directory generator matching any `applications/*`
  folder automatically): rejected — every app should be an explicit, reviewable opt-in via its
  own `addon-*-appset.yaml`, not implicitly picked up because a directory happens to exist.

## Consequences

- Adding an addon is a two-file change (new `addon-*-appset.yaml` + its `applications/<name>/base`
  content) with an explicit review point.
- The one-appset-per-namespace rule means a namespace can never accidentally be shared/fought
  over by two addons.
- Future improvement: as the number of addons grows, consider ApplicationSet-level
  `progressiveSync` or explicit ordering if addons develop real startup dependencies on each
  other (today, ordering is implicit via ArgoCD's own retry/self-heal loop).
