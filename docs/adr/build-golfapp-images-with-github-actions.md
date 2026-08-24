# Build golfapp's images with GitHub Actions, keep Argo Workflows for deploy

## Status

Accepted

## Context

[Use Argo Workflows for image builds, not GitHub Actions compute](use-argo-workflows-for-image-builds.md)
chose to keep all build compute self-hosted and in-cluster, and explicitly flagged its own future
risk: *"cache kaniko layers... if build times on the Pi's hardware become a bottleneck."* That
bottleneck arrived: a live build-and-deploy run for golfapp-api was measured (via a log watcher
attached to the running kaniko pod) at ~943s spent in the `build-and-push` step out of ~1044s total
pipeline time — roughly 90% of the wall clock, bounded by the Pi's own CPU/IO rather than queueing.
golfapp is also a 3-image Nx monorepo (api/web/dotgolf-service) sharing this template's single
`build-and-deploy` mutex, so slow builds serialize and compound across all three images rather than
running independently.

## Decision

golfapp's `trigger-*.yml` GitHub Actions workflows build and push their own images on GitHub-hosted
runners (`ubuntu-latest`) via `docker/build-push-action`, authenticating to `ghcr.io` with the
workflow's own `GITHUB_TOKEN` (no new credential to manage — the repo and image both live under the
`atidyshirt` account). The shared `build-and-deploy` WorkflowTemplate gains one new opt-in
parameter, `prebuilt_image`: when a project sets it, the template skips `prepare`/`build-and-push`
(kaniko) entirely and runs only `bump-deploy-repo` against the already-pushed image ref — the same
deploy step (kustomize edit + git push to the project's deploy repo) every project already goes
through, unchanged. ARC keeps its existing role exactly as described in
[Use ARC only as a NAT-traversal trigger bridge](use-arc-as-trigger-bridge-only.md): it still does
nothing but curl the cluster-internal Argo Events webhook from inside the network, now as a second
job (`notify`) that runs after the GitHub-hosted build completes instead of before it.

## Alternatives Considered

- **Tune kaniko flags** (`--single-snapshot`, `--compressed-caching=false`) to speed up the
  in-cluster build: rejected as the primary fix — even optimized, kaniko is still bounded by the
  Pi's own hardware, and doesn't help golfapp's three images serializing through one mutex.
- **Make this the new default build path for all projects** (update `homelab-app-template`
  itself): deferred. The original ADR's core reasoning — one shared, centrally-maintained build
  implementation instead of N near-identical per-project CI YAML files — still holds for the
  typical single-image project. golfapp opts in specifically because it's a multi-image monorepo
  with measured, real wall-clock pain, not because the general in-cluster-build approach is wrong.
- **Expose the internal Argo Events webhook publicly** so a purely GitHub-hosted workflow could
  notify it directly, with no ARC hop: rejected for the same reason given in
  use-arc-as-trigger-bridge-only.md — not worth the new public attack surface to save one short
  in-cluster job.

## Consequences

- golfapp's Dockerfiles and image tag scheme (`ghcr.io/atidyshirt/<app>:<sha>`) are unchanged;
  `golfapp-platform`'s kustomize deploy manifests need no changes.
- The `ghcr-push` PAT no longer needs golfapp's images in scope — GitHub Actions uses its own
  per-workflow `GITHUB_TOKEN` instead. Every other, still-kaniko-path project keeps using
  `ghcr-push` exactly as before.
- The shared `build-and-deploy` WorkflowTemplate now has two mutually exclusive paths gated by one
  parameter's `when:` conditions. A mistake there could silently skip both branches (or run both)
  for some project — worth a smoke test on at least one still-kaniko-path project after this
  change, not just golfapp.
- Any future project that wants this same opt-out takes on its own `docker/build-push-action` job
  to maintain — the exact per-project maintenance cost the original ADR weighed against a shared
  build implementation. This is a deliberate, scoped exception, not a reversal of that default.
