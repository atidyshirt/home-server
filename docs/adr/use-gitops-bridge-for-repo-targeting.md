# Use the gitops-bridge pattern for repo/revision targeting

## Status

Accepted

## Context

Every `ApplicationSet` needs to know which repo URL and git revision to sync from. Testing a
change on a PR branch should be possible without editing every `addon-*-appset.yaml` by hand,
and without a separate parallel set of "staging" appsets to keep in sync with the real ones.

## Decision

Pulumi registers the local cluster as an ArgoCD cluster Secret
(`argocd.argoproj.io/secret-type: cluster`, name `in-cluster`) carrying
`addons_repo_url`/`addons_repo_revision` annotations (along with `addons_domain`/
`addons_node_ip`). Every `ApplicationSet` uses ArgoCD's cluster generator and templates
`source.repoURL`/`targetRevision` from `{{metadata.annotations.addons_repo_url}}`/
`addons_repo_revision`, instead of a literal `targetRevision: main`.

## Alternatives Considered

- **Hardcoded `targetRevision: main` per appset**: rejected — testing a branch would mean
  editing every appset file (or maintaining a parallel "test" set of them) and reverting after.
- **A separate staging `ApplicationSet` set pointed at a fixed test branch**: rejected — doubles
  the manifests to maintain and drifts from the real ones over time.

## Consequences

- Pointing the entire cluster at a PR branch is `pulumi config set argocd:gitRevision <branch>`
  + `pulumi up` — see `docs/pr-workflow.md`.
- Every appset is identical in shape regardless of environment; there's only one "real" appset
  per addon to maintain.
- Future improvement: an ApplicationSet-level Pull Request generator could replace this manual
  revision-pinning step for actual PR preview environments, if that workflow becomes common
  enough to be worth automating.
