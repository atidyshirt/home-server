# Gate addon stacks behind Pulumi-managed cluster labels

## Status

Accepted

## Context

The Pi is a single-node cluster with limited CPU/memory. `monitoring` was previously disabled
by hand (`c6dc1fd`) by adding a `clusters.selector.matchLabels` gate to its `ApplicationSet` and
never setting the matching label on the `in-cluster` Secret — this drops the generated
`Application` count to zero, letting ArgoCD's resources-finalizer cascade-delete everything
under that addon without touching `applications/<name>/base`. The label itself was meant to be
set by hand (`kubectl label secret in-cluster -n argocd monitoring.stack.enabled=true`), which
doesn't survive a `pulumi up` recreating the Secret, and every other `addon-*-appset.yaml` used
an unrestricted `clusters: {}` generator with no way to turn them off the same way.

## Decision

Every addon's cluster generator now selects on a `<toggle-name>.stack.enabled: "true"` label,
and Pulumi (`GitopsBridge`) is the sole owner of those labels on the `in-cluster` Secret, driven
by a required `homelab:addonToggles` config object (`Pulumi.homelab.yaml`) — consistent with
this repo's "all config is `.require()`'d, no code defaults" convention (see `AGENT.md`).

Toggles are grouped, not fully per-addon:

- `platform.stack.enabled` — cert-manager, onepassword-operator, traefik, arc-controller,
  arc-runners, dex, argo-events, argo-workflows, argo-rollouts. These are expected to always be
  on together; there's no meaningful "half the platform" state.
- `coredns-lan.stack.enabled` — independent. It only exposes the LAN-facing DNS zone; the rest
  of the platform (including the Gateway itself) works without it.
- `monitoring.stack.enabled` — independent, the original resource-pressure kill switch.
- `golfapp.stack.enabled` — independent, since it's a per-project deployment, not core platform.

`addon-project-template-appset.yaml` is untouched — it uses a `matrix` generator over an
explicit per-project list, not the cluster generator, so there's nothing to gate.

## Alternatives Considered

- **Fully independent toggle per addon**: rejected — cert-manager/traefik/dex/etc. have no
  useful "on its own" state (e.g. dex without traefik's Gateway has nothing to attach an
  HTTPRoute to); one label to flip the whole core stack together is simpler and matches how
  they're actually operated.
- **Single global on/off label for every addon including monitoring/golfapp**: rejected — the
  entire point of the monitoring toggle was turning off *just* the resource-heavy optional
  stuff while keeping the platform up; collapsing everything into one label loses that.
- **Keep the manual `kubectl label` approach, just document it better**: rejected — doesn't
  survive Pulumi recreating the Secret, and doesn't generalize past the one addon it was
  hand-rolled for.

## Consequences

- Turning any group off/on is now `pulumi config set --path homelab:addonToggles.<name> <bool>`
  + `pulumi up`, not a manual `kubectl label` that silently reverts on the next Pulumi run.
- `homelab:addonToggles` must list all four keys (`platform`, `coredns-lan`, `monitoring`,
  `golfapp`) every time — `requireObject` throws if any are missing, by design.
- Adding a new platform-tier addon means adding it to the `platform.stack.enabled` selector in
  its own `addon-*-appset.yaml`, not touching Pulumi at all. Adding a new *independently*
  toggleable addon means adding both a new key to `AddonToggles` in `gitopsBridge.ts` and to
  `homelab:addonToggles` in `Pulumi.homelab.yaml`.
- `monitoring` is set to `false` in `Pulumi.homelab.yaml` to match the cluster's actual current
  state (still disabled from `c6dc1fd`) — this change doesn't re-enable it, flipping that back
  on is a deliberate follow-up.
