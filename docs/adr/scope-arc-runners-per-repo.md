# Scope ARC runners per-repo, not account-wide

## Status

Accepted

## Context

Every project onboarded through the GitHub template needs a self-hosted runner (see the
ARC-trigger-bridge ADR) that GitHub will dispatch jobs to for that project's own trigger
workflow. `atidyshirt` is a personal GitHub user account, not an Organization.

## Decision

Each project gets its own `AutoscalingRunnerSet`, with `githubConfigUrl` pointed at that
project's specific repo (e.g. `https://github.com/atidyshirt/home-server`), sharing the one
cluster-wide ARC controller. Project onboarding is three steps — `AppProject` +
`ApplicationSet` + a project-scoped `AutoscalingRunnerSet` — not two.

## Alternatives Considered

- **One shared, account-wide runner serving every project** (the original design intent):
  rejected — not possible. GitHub's self-hosted-runner registration API only supports org-wide
  or repo-level registration; there's no account-wide option for a personal GitHub account.
  Confirmed via a live 404 from `POST /orgs/atidyshirt/actions/runners/registration-token` —
  that endpoint doesn't exist for a `User`-type account (`gh api users/atidyshirt --jq .type`).
  A repo-level runner can, by GitHub's design, only ever run jobs from that one repo.
- **Convert the personal account to a GitHub Organization**: rejected for now — would restore
  the two-step, account-wide-runner design, but is a bigger, more disruptive change to the
  GitHub account/repo structure than this decision's scope justifies. Worth revisiting if the
  number of projects grows enough that per-repo runner sprawl becomes real overhead.

## Consequences

- Onboarding a new project needs one more piece than originally planned, but stays entirely
  within the same GitOps flow (all three pieces are plain git commits, no Pulumi involved).
  See ATI-51/52's design-correction note.
- Every project's runner is a small, low-privilege footprint (repo-scoped PAT permission:
  "Administration: Read and write" on that one repo) rather than one broadly-scoped credential
  shared across every project.
- Future improvement: converting to a GitHub Organization would collapse this back to the
  original two-step, single-shared-runner design — a live option if it ever seems worth the
  disruption.
