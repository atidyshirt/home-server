# ArgoCD ApplicationSet Pull Request preview environments for golfapp

## Status

Proposed — blocked on a prerequisite outside this repo. Implementation tracked as separate
issues in Linear's `continuous-integration` project: ATI-80 (PR-triggered image builds,
prerequisite), ATI-81 (GitHub token), ATI-82 (ApplicationSet + Pulumi toggle), ATI-83
(golfapp-platform preview overlay).

## Context

Want a per-PR preview deployment of golfapp using ArgoCD's [Pull Request
generator](https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Pull-Request/).
`golfapp-platform`'s `deploy/` is the only thing ArgoCD actually syncs for golfapp; `golf-ai-
experiment` is where PRs live and feeds it via the existing build-and-deploy pipeline.

## Decision

Build it, gated behind a `preview` label a human applies per PR (concurrency control — open-PR
count isn't ours to limit, label-gating is). Each labeled PR gets its own `golf-pr-<number>`
namespace with `api`+`web`+shim-`postgres` and `golf-pr-<number>.homelab.arpa` ingress.

- Hostnames need no DNS/TLS changes as long as they stay flat (`*.homelab.arpa` is a
  single-level wildcard) — but need `ApplicationSet`-level `kustomize.patches`, since the
  existing domain-suffix replacement trick can't rewrite the first label.
- GitHub token secret must live in `argocd` namespace (the generator's own namespace, not a
  per-app namespace like `arc-runners` uses) — fine-grained PAT, read-only PR scope.
- Shim postgres: plain `postgres:16-alpine` `Deployment` + `emptyDir`, no NFS/StatefulSet.
  `app.module.ts` already runs schema sync at boot in every non-prod environment, so an empty
  DB is already what golfapp expects.
- Cleanup needs `syncPolicy.managedNamespaceMetadata` — `CreateNamespace=true` alone doesn't
  track the namespace for pruning, so a closed PR would otherwise leak it.

## Alternatives Considered

- Preview every open PR unfiltered: rejected, removes the one concurrency lever we have.
- Nested subdomains (`pr-<n>.golf.homelab.arpa`): rejected, not covered by the existing
  wildcard cert/DNS.
- `StatefulSet` + NFS for preview postgres: rejected, preview data is disposable by design.
- GitHub App instead of a PAT: deferred, matches this repo's existing PAT-for-now stance.

## Consequences

- **Not functional yet**: `golf-ai-experiment`'s image builds only trigger `on: push: main` —
  no per-PR image exists, so previews would show every PR the same stale image. This is CI
  work in a third repo, out of scope here; the generator's `head_sha` is the hook a future
  PR-triggered build should feed.
- Preview workloads are the first golfapp manifests with explicit resource limits; prod stays
  unbounded (separate follow-up).
- Real SSO won't work from a preview URL (no registered redirect URI) — `dev-login` only.
