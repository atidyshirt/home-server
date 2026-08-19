# Use ARC only as a NAT-traversal trigger bridge

## Status

Accepted

## Context

A `git push` needs to trigger the build-and-deploy pipeline. The homelab has no public inbound
ingress — `homelab.arpa` is LAN-only, behind NAT with no port forwarding — so GitHub's servers
have no way to reach an Argo Events webhook running on the cluster directly.

## Decision

Run actions-runner-controller (ARC), whose self-hosted GitHub Actions runner reaches GitHub via
outbound long-poll (no inbound exposure needed to be registered/receive jobs). The runner's
GitHub Actions workflow does exactly one thing: a `curl` to an internal, ClusterIP-only Argo
Events webhook, from inside the cluster network. That webhook then triggers the actual build
(see the Argo-Workflows-for-builds ADR) — ARC never builds anything itself.

## Alternatives Considered

- **A public tunnel exposing the Argo Events webhook directly** (e.g. Cloudflare Tunnel,
  ngrok, a router port-forward): rejected — would mean exposing part of the home network to the
  public internet, and GitHub's native repo webhook feature could then call it with no
  GitHub Actions job needed at all, but the security tradeoff of a public endpoint into the
  homelab wasn't worth avoiding one extra hop (the ARC runner).
- **ARC runner does the whole build itself** (checkout + docker build + push, entirely inside
  the Actions job): rejected — see the Argo-Workflows-for-builds ADR; keeps build logic
  centralized and self-hosted-in-cluster rather than per-repo Actions YAML.

## Consequences

- No public endpoint is ever exposed from the homelab for this pipeline — the webhook is
  reachable only from inside the cluster network.
- Every project needs at least a minimal GitHub Actions workflow file (the thin trigger step),
  even though it does no real build work.
- ARC itself becomes a dependency for the whole pipeline to fire at all — if the runner can't
  reach GitHub (outbound), or GitHub can't dispatch jobs to it, nothing triggers.
- Future improvement: none currently planned — this fully solves the "no public inbound"
  constraint without exposing anything.
