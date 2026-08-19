# Commit image tag bumps back to git rather than patching the cluster directly

## Status

Accepted

## Context

After the build-and-deploy `WorkflowTemplate` pushes a newly-built image to GHCR, that image
tag has to end up on the project's `Rollout` resource for Argo Rollouts to actually deploy it.
Every other resource on this cluster is managed entirely through git (see the app-of-appsets
ADR) — ArgoCD's `selfHeal: true` will actively fight any change made directly to a live
resource that doesn't also exist in git.

## Decision

The final step of the shared `WorkflowTemplate` runs `kustomize edit set image` inside the
project's `deploy/` path (in that project's own repo) and commits + pushes the change, using a
gitops-bot credential. ArgoCD then picks up that commit through the project's own
`ApplicationSet` and syncs it normally.

## Alternatives Considered

- **The Workflow patches the live `Rollout` object directly** (e.g. `kubectl argo rollouts set
  image`): rejected — the fastest option, but breaks the GitOps invariant every other resource
  on this cluster follows. ArgoCD's `selfHeal` would either immediately revert the direct patch
  back to the stale image in git, or (if selfHeal happened to lose the race) the cluster and git
  would silently disagree about what's actually deployed until the next sync.
- **A separate "desired state" store outside git** (e.g. a database or ConfigMap the Workflow
  writes to, that some other process reconciles from): rejected — reinvents what ArgoCD + git
  already do, for no benefit.

## Consequences

- A full deploy cycle requires two round trips through git (the tag-bump commit, then ArgoCD's
  sync) rather than one direct API call — slightly slower, in exchange for the cluster's actual
  state always being reconstructable from git alone.
- The gitops-bot credential needs write access to every project repo it might need to commit
  to — a fine-grained PAT has to be explicitly granted per-repo, which is exactly the extra
  onboarding step called out in the ARC-per-repo ADR.
- Future improvement: a GitHub App (rather than a per-repo-granted PAT) would let the bot get
  automatic access to every new repo created from the template, removing that manual grant
  step — noted as a "basic setup" tradeoff, not yet built.
