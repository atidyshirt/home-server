# Graph Report - /Users/jordanp/projects/home-server__worktrees/feat-explore-transient-k3s-node  (2026-08-29)

## Corpus Check
- 6 files · ~45,830 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 95 nodes · 125 edges · 28 communities detected
- Extraction: 82% EXTRACTED · 18% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]

## God Nodes (most connected - your core abstractions)
1. `ADR Index` - 16 edges
2. `Architecture Overview` - 10 edges
3. `Commit Image Tag Bumps Back to Git` - 10 edges
4. `Continuous Delivery Pipeline` - 10 edges
5. `Adding a New Project Workflow` - 8 edges
6. `Provisioning Guide` - 8 edges
7. `Apply ArgoCD Bootstrap Manifests Directly via Pulumi` - 7 edges
8. `Use App-of-Appsets GitOps Pattern` - 7 edges
9. `Use ARC Only as NAT-Traversal Trigger Bridge` - 7 edges
10. `Use Argo Workflows for Image Builds, Not GitHub Actions Compute` - 7 edges

## Surprising Connections (you probably didn't know these)
- `GHCR (GitHub Container Registry)` --conceptually_related_to--> `Commit Image Tag Bumps Back to Git`  [INFERRED]
  /Users/jordanp/projects/home-server/docs/adr/use-ghcr-for-container-registry.md → /Users/jordanp/projects/home-server/docs/adr/commit-image-tags-back-to-git.md
- `Use 1Password Kubernetes Operator as Sole Secrets Mechanism` --conceptually_related_to--> `Apply ArgoCD Bootstrap Manifests Directly via Pulumi`  [INFERRED]
  /Users/jordanp/projects/home-server/docs/adr/use-1password-operator-for-secrets.md → /Users/jordanp/projects/home-server/docs/adr/apply-argocd-bootstrap-manifests-via-pulumi.md
- `Scope ARC Runners Per-Repo` --semantically_similar_to--> `Commit Image Tag Bumps Back to Git`  [INFERRED] [semantically similar]
  /Users/jordanp/projects/home-server/docs/adr/scope-arc-runners-per-repo.md → /Users/jordanp/projects/home-server/docs/adr/commit-image-tags-back-to-git.md
- `Continuous Delivery Pipeline` --conceptually_related_to--> `kaniko`  [EXTRACTED]
  /Users/jordanp/projects/home-server/docs/continous_delivery.md → /Users/jordanp/projects/home-server/docs/adr/use-argo-workflows-for-image-builds.md
- `Use GHCR, Not a Self-Hosted Registry` --semantically_similar_to--> `Use 1Password Kubernetes Operator as Sole Secrets Mechanism`  [INFERRED] [semantically similar]
  /Users/jordanp/projects/home-server/docs/adr/use-ghcr-for-container-registry.md → /Users/jordanp/projects/home-server/docs/adr/use-1password-operator-for-secrets.md

## Hyperedges (group relationships)
- **ArgoCD Server Exposure via Gateway API HTTPRoute** — argocd_httproute, lan_gateway, argocd_server_service, traefik_gatewayclass [EXTRACTED 0.85]
- **Build-and-Deploy CI/CD Pipeline (ARC trigger to Argo Events/Workflows/Rollouts)** — use_arc_as_trigger_bridge_only_decision, scope_arc_runners_per_repo_decision, use_argo_workflows_for_image_builds_decision, use_ghcr_for_container_registry_decision, commit_image_tags_back_to_git_decision, use_canary_with_manual_pause_for_rollouts_decision, run_single_replica_eventbus_jetstream_decision [EXTRACTED 0.90]
- **Dex SSO OAuth chain: staticClients, Auth0 connector, and Grafana generic_oauth all tied together via oidc-dex/oidc-auth0 secrets** — dex_values_static_clients, dex_values_auth0_connector, grafana_oauth_config, onepassword_item_oidc_dex_monitoring_ns [EXTRACTED 0.90]
- **GitOps Bootstrap and Repo-Targeting Pattern (Pulumi + ArgoCD app-of-appsets + gitops-bridge)** — apply_argocd_bootstrap_manifests_via_pulumi_decision, use_app_of_appsets_gitops_pattern_decision, use_gitops_bridge_for_repo_targeting_decision, concept_pulumi, concept_argocd [EXTRACTED 0.90]
- **Pulumi ComponentResource Bootstrap Modules Sharing Singleton K8s Provider** — argocd_argocd_class, gatewayapi_gatewayapi_class, gitopsbridge_gitopsbridge_class, onepassword_onepassword_class, raspberrypik0s_getkubernetesprovider [EXTRACTED 0.90]
- **Sensor ServiceAccount authorized via cross-namespace RBAC to submit WorkflowTemplate** — sensor_build_trigger_service_account, sensor_rbac_rolebinding, sensor_rbac_role, workflowtemplate_build_and_deploy [EXTRACTED 0.90]
- **Traefik TLS Certificate Issuance and Gateway Termination Flow** — traefik_certificate_yaml, homelab_ca_issuer, homelab_dev_tls_secret, traefik_websecure_listener, traefik_replacements_addons_domain [EXTRACTED 0.90]
- **build-and-deploy WorkflowTemplate step sequence (prepare, build-and-push, bump-deploy-repo)** — build_and_deploy_template_prepare, build_and_deploy_template_build_and_push, build_and_deploy_template_bump_deploy_repo [EXTRACTED 0.95]
- **GitHub Push to Workflow Submission Pipeline (EventSource -> Sensor -> WorkflowTemplate)** — eventsource_build_trigger, sensor_build_trigger, workflowtemplate_build_and_deploy, argo_events_eventbus_default [EXTRACTED 0.95]
- **ArgoCD App-of-Appsets Bootstrap Pattern** — argocd_root_application, addons_dir_appsets, appproject_platform, appproject_golf_application [INFERRED 0.75]
- **1Password-backed secret delivery to ARC runner scale sets** — addon_onepassword_operator_appset_applicationset, addon_arc_runners_appset_onepassword_items_source, addon_arc_controller_appset_applicationset [INFERRED 0.75]
- **GolfApp CI/CD delivery pipeline across ApplicationSets** — addon_golfapp_appset_applicationset, addon_arc_runners_appset_golfapp_platform_runner_set, addon_argo_rollouts_appset_applicationset, addon_project_template_appset_golf_project_element [INFERRED 0.80]
- **Homelab Networking, TLS, and Identity Pattern (domain, DNS, TLS, SSO)** — use_homelab_arpa_domain_decision, run_in_cluster_coredns_for_lan_dns_decision, use_self_signed_ca_for_internal_tls_decision, use_traefik_for_gateway_api_decision, use_standalone_dex_for_sso_decision [INFERRED 0.80]
- **OnePasswordItem secrets feeding cert/DNS-independent auth and registry flows across dex, monitoring, and ghcr-pull-secret** — onepassword_item_oidc_auth0, onepassword_item_oidc_dex_dex_ns, onepassword_item_oidc_dex_monitoring_ns, onepassword_item_ghcr_push [INFERRED 0.80]
- **Placeholder Token Substitution Pattern Across Domain-Dependent Configs** — agent_domain_configuration_pattern, agent_dex_placeholder_sed_pattern, agent_dns_coredns_lan, argocd_applyrootapp [INFERRED 0.80]
- **Shared addon bootstrap convention: clusters generator + addons_repo_url/domain annotations + selfHeal syncPolicy** — addons_shared_clusters_generator_pattern, addons_shared_addons_repo_url_annotation, addons_shared_addons_domain_annotation, addons_shared_selfheal_prune_syncpolicy [INFERRED 0.85]
- **Dex-ArgoCD OIDC Trust and Secret Sharing Chain** — argocd_dex_oidc_integration, agent_sso_dex_oidc_pattern, agent_dex_argocd_shared_secret_rationale, agent_argocd_hostaliases_rationale, agent_argocd_ca_trust_rationale [INFERRED 0.85]
- **Shared sed-based render-config initContainer pattern for templating domain placeholders across coredns-lan, dex, and grafana** — daemonset_render_config_initcontainer, dex_render_config_initcontainer, grafana_render_config_initcontainer [INFERRED 0.85]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.12
Nodes (5): ArgoCd, GatewayApi, GitopsBridge, getKubernetesProvider(), RaspberryPiK0s

### Community 1 - "Community 1"
Cohesion: 0.25
Nodes (14): ADR Index, Auth0, cert-manager, CoreDNS, Dex, Gateway API, Tailscale, Traefik (+6 more)

### Community 2 - "Community 2"
Cohesion: 0.24
Nodes (13): Commit Image Tag Bumps Back to Git, actions-runner-controller (ARC), Argo Events, Argo Rollouts, gitops-bot Credential, JetStream (NATS), k0s (single-node cluster), Kustomize (+5 more)

### Community 3 - "Community 3"
Cohesion: 0.56
Nodes (9): Adding a New Project Workflow, Apply ArgoCD Bootstrap Manifests Directly via Pulumi, Architecture Overview, ArgoCD, homelab-app-template, homelab-deploy-template, Pulumi, Use App-of-Appsets GitOps Pattern (+1 more)

### Community 4 - "Community 4"
Cohesion: 0.25
Nodes (8): 1Password Kubernetes Operator, Argo Workflows, GHCR (GitHub Container Registry), GitHub Actions, kaniko, Use 1Password Kubernetes Operator as Sole Secrets Mechanism, Use Argo Workflows for Image Builds, Not GitHub Actions Compute, Use GHCR, Not a Self-Hosted Registry

### Community 5 - "Community 5"
Cohesion: 0.5
Nodes (4): Rationale: oidc-dex Secret Copied Not Second OnePasswordItem, Dex Config Init-Container sed Substitution Pattern, Domain Configuration Propagation Pattern, Dex Standalone OIDC Broker Pattern

### Community 6 - "Community 6"
Cohesion: 0.67
Nodes (3): coredns-lan DNS Pattern for homelab.arpa, Rationale: Pi-hole Disabled in Favor of coredns-lan, Rationale: Tailscale 4via6 Route over Subnet Router

### Community 7 - "Community 7"
Cohesion: 0.67
Nodes (3): AGENT.md Architecture Reference, Pulumi ComponentResource Provisioning Pattern, home-server GitOps Repo Overview

### Community 8 - "Community 8"
Cohesion: 1.0
Nodes (2): cert-manager CA Bootstrap Sync Waves, Rationale: homelab.arpa Domain Switch for TLS

### Community 9 - "Community 9"
Cohesion: 1.0
Nodes (2): Documentation Conciseness Philosophy, No Code Comments Philosophy

### Community 10 - "Community 10"
Cohesion: 1.0
Nodes (0): 

### Community 11 - "Community 11"
Cohesion: 1.0
Nodes (0): 

### Community 12 - "Community 12"
Cohesion: 1.0
Nodes (1): index.ts

### Community 13 - "Community 13"
Cohesion: 1.0
Nodes (1): @pulumi/command

### Community 14 - "Community 14"
Cohesion: 1.0
Nodes (1): @pulumi/kubernetes

### Community 15 - "Community 15"
Cohesion: 1.0
Nodes (1): @pulumi/pulumi

### Community 16 - "Community 16"
Cohesion: 1.0
Nodes (1): @types/node

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (1): typescript

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (1): AppProjects Namespace Enforcement Pattern

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (1): Rationale: Merged CA Bundle via SSL_CERT_FILE Instead of Replacing System Trust Store

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (1): Rationale: hostAliases on argocd-server Instead of Patching kube-system CoreDNS

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (1): Rationale: Traefik Chosen over Envoy Gateway

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (1): Gitops-Bridge Revision Pinning Pattern

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (1): Rationale: KubernetesProvider Interface as Swap Seam

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (1): Rationale: protect true on argocd/onepassword Namespaces

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (1): 1Password Kubernetes Operator Secrets Pattern

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (1): Rationale: per-project defaults live under platform, one Application per project namespace not per project repo

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (1): Graphify Project Rules

## Knowledge Gaps
- **38 isolated node(s):** `index.ts`, `@pulumi/command`, `@pulumi/kubernetes`, `@pulumi/pulumi`, `@types/node` (+33 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 8`** (2 nodes): `cert-manager CA Bootstrap Sync Waves`, `Rationale: homelab.arpa Domain Switch for TLS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 9`** (2 nodes): `Documentation Conciseness Philosophy`, `No Code Comments Philosophy`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 10`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (1 nodes): `kubernetesProvider.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (1 nodes): `@pulumi/command`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (1 nodes): `@pulumi/kubernetes`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (1 nodes): `@pulumi/pulumi`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (1 nodes): `@types/node`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (1 nodes): `typescript`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (1 nodes): `AppProjects Namespace Enforcement Pattern`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (1 nodes): `Rationale: Merged CA Bundle via SSL_CERT_FILE Instead of Replacing System Trust Store`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (1 nodes): `Rationale: hostAliases on argocd-server Instead of Patching kube-system CoreDNS`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (1 nodes): `Rationale: Traefik Chosen over Envoy Gateway`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (1 nodes): `Gitops-Bridge Revision Pinning Pattern`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (1 nodes): `Rationale: KubernetesProvider Interface as Swap Seam`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (1 nodes): `Rationale: protect true on argocd/onepassword Namespaces`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (1 nodes): `1Password Kubernetes Operator Secrets Pattern`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (1 nodes): `Rationale: per-project defaults live under platform, one Application per project namespace not per project repo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (1 nodes): `Graphify Project Rules`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ADR Index` connect `Community 1` to `Community 2`, `Community 3`, `Community 4`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `Commit Image Tag Bumps Back to Git` connect `Community 2` to `Community 1`, `Community 3`, `Community 4`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `Provisioning Guide` connect `Community 1` to `Community 3`, `Community 4`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `Commit Image Tag Bumps Back to Git` (e.g. with `Scope ARC Runners Per-Repo` and `GHCR (GitHub Container Registry)`) actually correct?**
  _`Commit Image Tag Bumps Back to Git` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `Adding a New Project Workflow` (e.g. with `Use App-of-Appsets GitOps Pattern` and `Use the gitops-bridge Pattern for Repo/Revision Targeting`) actually correct?**
  _`Adding a New Project Workflow` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `index.ts`, `@pulumi/command`, `@pulumi/kubernetes` to the rest of the system?**
  _38 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._