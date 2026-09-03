# PR workflow

Referenced from `AGENT.md` — this is the "how changes land" doc, not architecture.

## Linear tracking

Every non-trivial change gets a Linear issue before work starts (check for an existing one
first; create it if none fits). Reference the issue ID in the branch name and PR title —
`(ATI-84)`/`(AWP-58)`-style, matching existing history. Non-trivial context (the "why") belongs
in the issue, not a code comment (see `AGENT.md`'s **Code comments** section) — a PR description
can be a one-line pointer to the issue rather than re-explaining it.

Move the issue to Done when its PR merges — not before, not left stale after. Don't mark
something Done because the PR opened; the PR can still change or get abandoned. If a change
turns out to be blocked on something outside its own repo, don't guess: file the blocker as its
own issue and link it, so "why is this stuck" is answered by Linear, not by re-deriving it from
scratch later.

Skip a Linear issue only for genuinely trivial changes (a typo, a comment fix) where filing one
would outweigh the change itself.

## Writing style

Linear issue descriptions, PR descriptions, and comments follow the same rule as this repo's
docs (`AGENT.md`'s **Documentation** section): extremely concise, no restating what a diff
already shows. State the change, the reason, and anything a reviewer can't get from the diff
alone — nothing else.

## Pinning a revision for preview

`addon-*-appset.yaml` read `targetRevision` from the `in-cluster` Secret's
`addons_repo_revision` annotation (see `AGENT.md`'s **Pinning a revision** section), not a
hardcoded `main`. To point every addon at a PR branch instead:

```bash
pulumi config set argocd:gitRevision <branch>
pulumi up
```

Revert to `main` the same way once the PR merges.

## Adding a new app

For a platform addon living in *this* repo (not a separate project — see
[docs/workflows/adding_a_new_project.md](workflows/adding_a_new_project.md) for that case):

1. Add an `AppProject` to `bootstrap/argocd/projects.yaml` if none of the existing ones
   (`platform`, `golf-application`) fit — scoped to the new addon's namespace.
2. Add `applications/<name>/base` (kustomization + `values.yaml` if wrapping a Helm chart).
3. Add `addons/addon-<name>-appset.yaml` referencing that `AppProject` and path.

Both `projects.yaml` and `root-app.yaml` are applied directly by Pulumi (`pulumi up`), not
gitops-synced — see `AGENT.md`'s **AppProjects** section for why.
