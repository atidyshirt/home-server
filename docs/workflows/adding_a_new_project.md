# Adding a new project

Onboarding a project (its own repo, own build/deploy pipeline, own namespace) — `golfapp` is
the worked example throughout. Four steps: an `AppProject` (Pulumi), project defaults (git), an
appset (git), a runner (git).

Not the same as [pr-workflow.md](../pr-workflow.md)'s "Adding a new app" — that's for platform
addons living in this repo. A project has its own source + deploy repos (from the templates
below) and its own CI pipeline.

## 0. Scaffold from the templates

- [homelab-app-template](https://github.com/atidyshirt/homelab-app-template) → your new source
  repo. Dockerfile + a thin CI trigger workflow (pushes a webhook event, doesn't build anything
  itself).
- [homelab-deploy-template](https://github.com/atidyshirt/homelab-deploy-template) → your new
  deploy repo. `Rollout`/`Service`/`HTTPRoute` with canary + a preview hostname.

Replace the `REPLACE_ME`/`REPLACE_ORG` placeholders in both. Keep them as two separate repos —
the pipeline's own image-tag-bump commits shouldn't collide with your app commits.

## 1. AppProject (Pulumi)

Add an `AppProject` to `bootstrap/argocd/projects.yaml`, scoped to your project's namespace:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: <name>-application
  namespace: argocd
spec:
  description: <name>-application
  sourceRepos:
    - https://github.com/atidyshirt/<name>-platform
  destinations:
    - server: https://kubernetes.default.svc
      namespace: <name>
  clusterResourceWhitelist:
    - group: ''
      kind: Namespace
```

`clusterResourceWhitelist` is needed because `CreateNamespace=true` (step 3) creates a
cluster-scoped `Namespace` — AppProjects default-deny those.

This is the one step that needs Pulumi: `bootstrap/argocd/*.yaml` is applied directly, not
gitops-synced, because an `Application` referencing an `AppProject` that doesn't exist yet fails
to sync — it can't wait on ArgoCD's own git loop.

```bash
cd provisioning/pulumi
PULUMI_CONFIG_PASSPHRASE=<passphrase> pulumi up
```

## 2. Project defaults (git)

Add your project as one more `list` element to `addons/addon-project-template-appset.yaml`:

```yaml
                - name: <name>
                  namespace: <name>
```

This is what actually makes your namespace usable — a restrictive default `ServiceAccount`
(read-only on a small resource allowlist, `automountServiceAccountToken: false`) and the shared
GHCR pull secret (your images are private by default; nothing else makes them pullable). It
lives here rather than in your own appset because it needs cluster-elevated permission
(RBAC/`ServiceAccount` edits) your project's own `AppProject` shouldn't have — see
`applications/project-template/base`.

Push.

## 3. Appset (git)

Add `addons/addon-<name>-appset.yaml`:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: <name>
  namespace: argocd
spec:
  generators:
    - clusters: {}
  template:
    metadata:
      name: <name>
    spec:
      project: <name>-application
      source:
        repoURL: https://github.com/atidyshirt/<name>-platform
        targetRevision: main
        path: deploy
        kustomize:
          commonAnnotations:
            addons_domain: '{{metadata.annotations.addons_domain}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: <name>
      syncPolicy:
        automated:
          selfHeal: true
          prune: true
        syncOptions:
          - CreateNamespace=true
          - ServerSideApply=true
```

Push. From here it's pure GitOps — `root-app.yaml` already scans `addons/*-appset.yaml`.

> [!NOTE]
> Multiple apps in one deploy repo (a monorepo, e.g. `golfapp-platform`)? Point `path: deploy`
> at a directory that itself aggregates each app's own `deploy/<app>/` — see that repo's
> `deploy/kustomization.yaml`. One `Application`, one health status, still one commit per app
> from the build pipeline.

## 4. Runner (git)

ARC runner registration is repo-scoped on this (personal) GitHub account — no account-wide
option, so the shared `home-server-runner-set` can't serve your project's jobs (see
[the ADR](../adr/scope-arc-runners-per-repo.md)). Add one more source to
`addons/addon-arc-runners-appset.yaml`:

```yaml
        - repoURL: '{{metadata.annotations.addons_repo_url}}'
          targetRevision: '{{metadata.annotations.addons_repo_revision}}'
          path: applications/arc-runners/base
          helm:
            valuesObject:
              gha-runner-scale-set:
                githubConfigUrl: https://github.com/atidyshirt/<name>
                runnerScaleSetName: <name>-runner-set
```

Push, then set repo variables on your new source repo (Settings → Secrets and variables →
Actions → Variables) so its trigger workflow knows where to send its webhook:

| Variable | Value |
| --- | --- |
| `RUNNER_SCALE_SET_NAME` | `<name>-runner-set` |
| `BUILD_WEBHOOK_URL` | `http://build-trigger-eventsource-svc.argo-events.svc.cluster.local:12000/push` |
| `DEPLOY_REPO` | `atidyshirt/<name>-platform` |

## Done when

A push to your source repo's `main` fires the trigger workflow → your project's runner picks it
up → kaniko builds and pushes to GHCR → `gitops-bot` bumps the tag in your deploy repo → ArgoCD
syncs → the Rollout canaries in, paused, at `<app>-canary.homelab.arpa`.
