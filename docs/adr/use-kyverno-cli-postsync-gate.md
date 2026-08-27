# Use CLI-mode Kyverno as an enforcing PostSync gate, piloted on one addon

## Status

Accepted

## Context

The cluster has no policy-validation gate at all today — a manifest that violates a guardrail
(e.g. wildcard RBAC) syncs cleanly. Kyverno is the natural fit (native Kubernetes-policy
engine, no separate DSL), but its usual deployment is a live in-cluster admission webhook —
a permanent, always-running controller and a hard dependency for the whole API server. The Pi
is already resource-constrained enough that monitoring is fully disabled for exactly this
reason (`c6dc1fd`); a live admission controller is a bigger, harder-to-reverse commitment than
a first pilot warrants.

## Decision

Run policy checks out-of-band, as a step inside an Argo Workflow, using the standalone
`kyverno` CLI (`ghcr.io/kyverno/kyverno-cli`) against plain `ClusterPolicy` YAML files and a
snapshot of the target namespace's live resources (`kyverno apply <policies> --resource
<resources>`) — no Kyverno CRDs or controller installed in-cluster at all. The policy files are
never applied as live `ClusterPolicy` custom resources (there's no CRD for the API server to
accept them); they're bundled into a plain `ConfigMap` via kustomize's `configMapGenerator`
(`applications/project-template/base/policies/` -> `kyverno-policies` ConfigMap) purely as a
way to ship the YAML text through the same GitOps sync ArgoCD already does, then read back out
by the Workflow.

This gate is **enforcing**: `kyverno apply` exits non-zero on any policy failure (no
`--audit-warn`), and that exit code is made to fail the sync (see below) — a violation shows up
as ArgoCD's sync going red/degraded, not a log line.

Piloted on exactly one addon, `applications/project-template`, before any repo-wide rollout.
It's the addon whose own RBAC (`rbac.yaml`) is a good, currently-non-wildcarded test case, and
limiting blast radius to one namespace while the pattern is unproven (new cross-namespace RBAC,
new WorkflowTemplate, a new failure mode for every future sync of that one addon) means a
mistake breaks one project's syncs, not every addon's, and the mechanics below are the ones a
repo-wide rollout would validate before generalizing.

**PostSync hook shape**: a plain `Job` (`kyverno-postsync-hook.yaml`), not the Argo `Workflow`
itself. ArgoCD's `resource.customizations` in `provisioning/pulumi/src/argocd.ts` has no health
check registered for `argoproj.io/Workflow` today, so ArgoCD doesn't know how to read a
Workflow's `status.phase` into Healthy/Degraded — a `Workflow` used directly as a PostSync hook
wouldn't reliably propagate a validation failure into the sync status. A `Job` already has
well-understood, built-in success/failure semantics in ArgoCD. The Job's container runs `argo
submit --from=workflowtemplate/kyverno-validate --wait`, which blocks until the Workflow
finishes and exits non-zero if it fails/errors — so the Job's own exit code mirrors the
Workflow's outcome, with zero changes to shared ArgoCD config.

The alternative — add a `resource.customizations.health.argoproj.io_Workflow` lua snippet to
`argocd-cm` and use the `Workflow` directly as the hook — was rejected for this pilot: it's a
cluster-wide ArgoCD config change (affects health-check behavior for every `Workflow` on the
cluster, not just this one), a bigger and less reversible commitment than adding a Job to one
addon's own kustomization. Worth revisiting if a repo-wide rollout ends up wanting native
Workflow-level visibility in the ArgoCD UI instead of a wrapper Job's logs.

## Alternatives Considered

- **Live Kyverno admission controller (webhook)**: rejected — permanent resource-hungry
  component, hard dependency for the whole API server, wrong pattern for a single-node
  resource-constrained Pi and an unproven pilot. Explicitly out of scope per the task.
- **A bare Job running `kyverno apply` directly**, not routed through Argo Workflows: rejected
  — this repo already has a general-purpose execution engine (Argo Workflows,
  `use-argo-workflows-for-image-builds.md`) with established conventions
  (`serviceAccountName: argo-workflow`, shared `workspace` PVC, one container per step); a bare
  Job would duplicate that instead of reusing it.
- **`Workflow` as the PostSync hook + new ArgoCD health check**: see above — deferred, not
  rejected outright; a reasonable choice for repo-wide rollout, more shared-config risk for a
  single-addon pilot.
- **Audit-only (`--audit-warn`, or just running informationally)**: rejected — the task
  requirement is enforcing; a violation must make the sync go red, not just get logged.

## Consequences

- A policy violation in `project-template`'s Roles now blocks that addon's sync (Job fails ->
  PostSync hook fails -> ArgoCD reports degraded) instead of silently applying.
- New cross-namespace RBAC: a `RoleBinding` in `argo-workflows` letting the pilot namespace's
  hook `ServiceAccount` submit into `kyverno-validate` (mirrors the existing pattern in
  `sensor-rbac.yaml`), and a `RoleBinding` in the pilot namespace letting `kyverno-validate`'s
  `argo-workflow` `ServiceAccount` read that namespace's `Role`s and its policy `ConfigMap`.
  Both are scoped, narrow grants — not cluster-wide. A repo-wide rollout means one more such
  pair of bindings per onboarded addon namespace (or a more general mechanism, deliberately not
  designed here).
- First-sync bootstrap ordering: the `argo-workflows` app must have synced at least once with
  its new submit-RBAC and `kyverno-validate` template before `project-template`'s PostSync hook
  can succeed — the two are separate ArgoCD Applications with no sync-wave ordering between
  them. Not a concern once both have synced once; only matters when first onboarding.
  Handling it structurally isn't scoped for a single-addon pilot.
- The pilot's policy set intentionally checks `kind: Role` only, not `ClusterRole`, even though
  the `kyverno-validate` template accepts a `resource_kinds` parameter that can fetch
  `clusterroles.rbac.authorization.k8s.io` too — see the PR description for why, and what
  extending it later needs.
- Future improvement: once this pilot has synced green (and a deliberately-broken test case has
  been proven to go red) against the live cluster, extend `resource_kinds` to `ClusterRole` and
  onboard more addons, generalizing the per-addon RBAC pair above rather than hand-copying it.
