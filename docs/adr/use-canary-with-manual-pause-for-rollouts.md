# Use canary-with-manual-pause as the default Rollout strategy

## Status

Accepted

## Context

Every project deploy manifest needs a default Argo Rollouts strategy to start from. Argo
Rollouts supports several progressive-delivery strategies of varying complexity, some requiring
a metrics provider and traffic-shaping plugin for the underlying Gateway.

## Decision

Default every project's `Rollout` to a plain replica-ratio canary strategy with a manual
promotion pause — a small percentage of pods run the new version, the rollout pauses, and a
human runs `kubectl argo rollouts promote` to continue. No traffic-shaping plugin, no automated
analysis step.

## Alternatives Considered

- **A metrics-driven automated canary** (using `AnalysisTemplate`s to auto-promote or
  auto-rollback based on error rate/latency): rejected as the default — requires a metrics
  provider (e.g. Prometheus) wired up per-project before it can do anything useful, which is
  more setup than a "basic setup" template should demand up front.
- **Plain rolling update** (equivalent to a standard Kubernetes `Deployment`): rejected as the
  default — would mean pulling in the Argo Rollouts CRD/controller for a project without
  actually using any of its progressive-delivery behavior, making the Rollouts dependency
  pointless for that project.
- **Blue-green deployment**: rejected as the default — needs two full-size replica sets running
  simultaneously during a rollout (double the resource footprint), a real cost on a
  resource-constrained single-node Pi.

## Consequences

- Every rollout requires a manual promotion step by design — safe by default, but means no
  fully-automated deploys out of the box.
- No dependency on a metrics/observability stack to get basic progressive delivery working.
- Future improvement: once a metrics provider exists on the cluster, individual projects could
  opt into automated analysis-gated promotion instead of the manual pause, without changing the
  shared pipeline itself.
