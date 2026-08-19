# Use Argo Workflows for image builds, not GitHub Actions compute

## Status

Accepted

## Context

Building and pushing a container image needs somewhere to actually run `docker build`
equivalent logic. The homelab already runs Argo Workflows as a general-purpose,
self-hosted execution engine.

## Decision

A shared Argo `WorkflowTemplate`, triggered by Argo Events, does the actual build: clone the
project repo at a given SHA, build and push the image via kaniko, then commit the new tag back
to the project's deploy manifests. GitHub Actions is not involved in the build step at all.

## Alternatives Considered

- **GitHub-hosted Actions runners**: rejected — the build compute would live entirely outside
  the homelab, using GitHub's free-tier minutes for work the cluster's own hardware could do,
  and would need a separate mechanism (Actions-native git operations) to commit results back.
- **Self-hosted GitHub Actions runners doing the full build**: rejected as the *build* mechanism
  specifically — self-hosted runners are still used (via ARC), but only as a thin trigger bridge
  (see the ARC-trigger-bridge ADR), not to run the build itself. Keeping the build in Argo
  Workflows means the build logic is one shared, centrally-maintained `WorkflowTemplate` reused
  by every project, rather than duplicated CI YAML per project repo.

## Consequences

- Every project's actual build logic lives in one place (the shared `WorkflowTemplate`) and can
  be improved once for every project, instead of N copies of near-identical GitHub Actions YAML.
- Build compute is entirely self-hosted — bounded by the Pi's own resources, not GitHub Actions
  minutes.
- kaniko (not a Docker daemon) is required for rootless, non-privileged image builds inside a
  Kubernetes pod.
- Future improvement: cache kaniko layers (e.g. via a registry-backed cache) if build times on
  the Pi's hardware become a bottleneck.
