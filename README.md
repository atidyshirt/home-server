# home-server

GitOps repo for a homelab Kubernetes cluster (k0s, single Raspberry Pi node), managed via
ArgoCD ApplicationSets.

## Docs

- [Provisioning](docs/provisioning.md) — one-time Pulumi bootstrap, manual router/DNS steps
- [Testing a branch before merging](AGENT.md#pinning-a-revision-gitops-bridge-pattern) — pointing
  the cluster at a PR branch instead of main
- [Adding a new project](docs/workflows/adding_a_new_project.md) — onboarding a project with its
  own repo, CI pipeline, and namespace
- [Kubernetes on a Raspberry Pi (k0s)](docs/kubernetes-raspberrypi-k0s.md) — cluster access, why
  k0s, known quirks
- [AGENT.md](AGENT.md) — full architecture reference
