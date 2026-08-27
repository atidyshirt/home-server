# Apply ArgoCD's bootstrap manifests directly via Pulumi

## Status

Accepted

## Context

The root `Application`, the `AppProject`s it depends on, and ArgoCD's own `HTTPRoute` have a
chicken-and-egg problem: an `Application` referencing a `project` that doesn't exist yet fails
to sync, so the `AppProject` must exist *before* ArgoCD ever tries to reconcile anything against
it. That can't be something ArgoCD's own git sync loop resolves, since it's the very thing
that loop depends on to start working at all.

## Decision

`bootstrap/argocd/root-app.yaml`, `projects.yaml`, and `httproute.yaml` are not ArgoCD-managed.
Pulumi (`ArgoCd.applyRootApp()`) templates their `__GIT_REPO_URL__`/`__GIT_REVISION__`/
`__DOMAIN__` placeholders and applies them directly, once, during provisioning. From that point
on, ArgoCD reads everything else (`addons/addon-*-appset.yaml` and beyond) from git normally.

## Alternatives Considered

- **Let ArgoCD manage its own root Application/AppProjects via a bootstrap script run once
  manually**: rejected — reintroduces a manual, undocumented step outside Pulumi's otherwise
  fully declarative provisioning flow.
- **A Kubernetes `Job` that applies these manifests on cluster init**: rejected — adds a new
  moving part (image, RBAC, completion tracking) to solve a problem Pulumi already solves for
  every other one-time cluster object.

## Consequences

- These three files can't be edited purely through the normal GitOps PR flow — a change to
  them requires `pulumi up`, not just a merge (see
  [AGENT.md](../../AGENT.md#pinning-a-revision-gitops-bridge-pattern)).
- Bootstrapping a fresh cluster is a single `pulumi up`, no manual `kubectl apply` step.
- Future improvement: if these files need to change often, consider a thin ArgoCD
  `Application`-of-`Application`s layer so more of the bootstrap becomes git-editable — not
  worth the complexity today since they change rarely.
