# home-server

GitOps repo for a homelab Kubernetes cluster (k0s, single Raspberry Pi node), managed via
ArgoCD ApplicationSets.

## Docs

- [Provisioning](docs/provisioning.md) — one-time Pulumi bootstrap, manual router/DNS steps
- [PR workflow](docs/pr-workflow.md) — testing a branch before merging, adding a new app
- [Kubernetes on a Raspberry Pi (k0s)](docs/kubernetes-raspberrypi-k0s.md) — cluster access, why
  k0s, known quirks
- [AGENT.md](AGENT.md) — full architecture reference
