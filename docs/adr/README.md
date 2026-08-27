# Architecture decision records

Format: [Michael Nygard's ADR template](https://github.com/architecture-decision-record/architecture-decision-record/blob/main/locales/en/templates/decision-record-template-by-michael-nygard/index.md) — Status / Context / Decision / Alternatives Considered / Consequences.

- [Use an app-of-appsets GitOps pattern, one ApplicationSet per namespace](use-app-of-appsets-gitops-pattern.md)
- [Apply ArgoCD's bootstrap manifests directly via Pulumi](apply-argocd-bootstrap-manifests-via-pulumi.md)
- [Use the gitops-bridge pattern for repo/revision targeting](use-gitops-bridge-for-repo-targeting.md)
- [Use the 1Password Kubernetes Operator as the sole secrets mechanism](use-1password-operator-for-secrets.md)
- [Use a standalone Dex instance for SSO, not ArgoCD's bundled sidecar](use-standalone-dex-for-sso.md)
- [Use homelab.arpa as the internal domain](use-homelab-arpa-domain.md)
- [Use a self-signed CA chain for internal TLS](use-self-signed-ca-for-internal-tls.md)
- [Run an in-cluster CoreDNS addon for LAN DNS](run-in-cluster-coredns-for-lan-dns.md)
- [Use Traefik for the Gateway API implementation](use-traefik-for-gateway-api.md)
- [Use GHCR, not a self-hosted registry](use-ghcr-for-container-registry.md)
- [Use Argo Workflows for image builds, not GitHub Actions compute](use-argo-workflows-for-image-builds.md)
- [Use ARC only as a NAT-traversal trigger bridge](use-arc-as-trigger-bridge-only.md)
- [Scope ARC runners per-repo, not account-wide](scope-arc-runners-per-repo.md)
- [Commit image tag bumps back to git rather than patching the cluster directly](commit-image-tags-back-to-git.md)
- [Use canary-with-manual-pause as the default Rollout strategy](use-canary-with-manual-pause-for-rollouts.md)
- [Run EventBus JetStream single-replica for single-node topology](run-single-replica-eventbus-jetstream.md)
- [Keep ADRs decision-level; no comments in code or YAML](keep-adrs-decision-level-no-code-comments.md)
