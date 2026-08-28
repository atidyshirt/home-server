# Graph Report - home-server  (2026-08-28)

## Corpus Check
- Corpus is ~16,483 words - fits in a single context window. You may not need a graph.

## Summary
- 348 nodes · 489 edges · 27 communities (21 shown, 6 thin omitted)
- Extraction: 81% EXTRACTED · 18% INFERRED · 1% AMBIGUOUS · INFERRED: 88 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- GitOps Platform Concepts
- Homelab Design Rationale
- Pulumi Bootstrap Modules
- Grafana Dashboards & Metrics
- ARC Runner & Build Infra
- ArgoCD Bootstrap & Ingress
- Pulumi npm Dependencies
- ARC Controller & Runners Addons
- GolfApp CI Runners & Repos
- Project Template RBAC & Secrets
- Argo Events/Workflows Addons
- TypeScript Config
- GHCR Pull Secret Provisioning
- Cert-Manager & Dex Addons
- Project Template & Traefik Addons
- Home-Server Runner & CoreDNS Addon
- TLS Certificate Chain
- CoreDNS LAN Resources
- Argo Rollouts Addon
- Monitoring Addon
- Pulumi Bootstrap Package
- TLS Bootstrap Rationale
- Documentation Philosophy
- Graphify Tooling
- Devenv Nix Config
- k0s Bootstrap Script
- CA Trust Secret (duplicate)

## God Nodes (most connected - your core abstractions)
1. `ADR Index` - 16 edges
2. `clusters: {} generator pattern (all-clusters rollout)` - 11 edges
3. `addons_repo_url / addons_repo_revision cluster annotations` - 11 edges
4. `addons_domain / addons_node_ip / addons_node_ip_v6 commonAnnotations` - 11 edges
5. `ArgoCd ComponentResource` - 10 edges
6. `golfapp ApplicationSet` - 10 edges
7. `Commit Image Tag Bumps Back to Git` - 10 edges
8. `Architecture Overview` - 10 edges
9. `Continuous Delivery Pipeline` - 10 edges
10. `addon-arc-controller ApplicationSet` - 9 edges

## Surprising Connections (you probably didn't know these)
- `ARC Smoke Test Workflow` --conceptually_related_to--> `home-server-bootstrap Package`  [AMBIGUOUS]
  /Users/jordanp/projects/home-server/.github/workflows/arc-smoke-test.yml → /Users/jordanp/projects/home-server/provisioning/pulumi/package.json
- `addon-argo-rollouts ApplicationSet` --semantically_similar_to--> `golf-canary Web info entry`  [INFERRED] [semantically similar]
  /Users/jordanp/projects/home-server/addons/addon-argo-rollouts-appset.yaml → /Users/jordanp/projects/home-server/addons/addon-golfapp-appset.yaml
- `Role: default-restricted` --semantically_similar_to--> `GatewayClass: traefik`  [INFERRED] [semantically similar]
  /Users/jordanp/projects/home-server/applications/project-template/base/rbac.yaml → /Users/jordanp/projects/home-server/applications/traefik/base/values.yaml
- `Graphify Project Rules` --implements--> `Graphify PreToolUse Hook`  [INFERRED]
  /Users/jordanp/projects/home-server/CLAUDE.md → /Users/jordanp/projects/home-server/.claude/settings.json
- `home-server-bootstrap Package` --conceptually_related_to--> `home-server-bootstrap Pulumi Project`  [INFERRED]
  /Users/jordanp/projects/home-server/provisioning/pulumi/package.json → /Users/jordanp/projects/home-server/provisioning/pulumi/Pulumi.yaml

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Pulumi ComponentResource Bootstrap Modules Sharing Singleton K8s Provider** — argocd_argocd_class, gatewayapi_gatewayapi_class, gitopsbridge_gitopsbridge_class, onepassword_onepassword_class, raspberrypik0s_getkubernetesprovider [EXTRACTED 0.90]
- **Dex-ArgoCD OIDC Trust and Secret Sharing Chain** — argocd_dex_oidc_integration, agent_sso_dex_oidc_pattern, agent_dex_argocd_shared_secret_rationale, agent_argocd_hostaliases_rationale, agent_argocd_ca_trust_rationale [INFERRED 0.85]
- **Placeholder Token Substitution Pattern Across Domain-Dependent Configs** — agent_domain_configuration_pattern, agent_dex_placeholder_sed_pattern, agent_dns_coredns_lan, argocd_applyrootapp [INFERRED 0.80]
- **1Password-backed secret delivery to ARC runner scale sets** — addon_onepassword_operator_appset_applicationset, addon_arc_runners_appset_onepassword_items_source, addon_arc_controller_appset_applicationset [INFERRED 0.75]
- **Shared addon bootstrap convention: clusters generator + addons_repo_url/domain annotations + selfHeal syncPolicy** — addons_shared_clusters_generator_pattern, addons_shared_addons_repo_url_annotation, addons_shared_addons_domain_annotation, addons_shared_selfheal_prune_syncpolicy [INFERRED 0.85]
- **GolfApp CI/CD delivery pipeline across ApplicationSets** — addon_golfapp_appset_applicationset, addon_arc_runners_appset_golfapp_platform_runner_set, addon_argo_rollouts_appset_applicationset, addon_project_template_appset_golf_project_element [INFERRED 0.80]
- **GitHub Push to Workflow Submission Pipeline (EventSource -> Sensor -> WorkflowTemplate)** — eventsource_build_trigger, sensor_build_trigger, workflowtemplate_build_and_deploy, argo_events_eventbus_default [EXTRACTED 0.95]
- **Sensor ServiceAccount authorized via cross-namespace RBAC to submit WorkflowTemplate** — sensor_build_trigger_service_account, sensor_rbac_rolebinding, sensor_rbac_role, workflowtemplate_build_and_deploy [EXTRACTED 0.90]
- **build-and-deploy WorkflowTemplate step sequence (prepare, build-and-push, bump-deploy-repo)** — build_and_deploy_template_prepare, build_and_deploy_template_build_and_push, build_and_deploy_template_bump_deploy_repo [EXTRACTED 0.95]
- **OnePasswordItem secrets feeding cert/DNS-independent auth and registry flows across dex, monitoring, and ghcr-pull-secret** — onepassword_item_oidc_auth0, onepassword_item_oidc_dex_dex_ns, onepassword_item_oidc_dex_monitoring_ns, onepassword_item_ghcr_push [INFERRED 0.80]
- **Dex SSO OAuth chain: staticClients, Auth0 connector, and Grafana generic_oauth all tied together via oidc-dex/oidc-auth0 secrets** — dex_values_static_clients, dex_values_auth0_connector, grafana_oauth_config, onepassword_item_oidc_dex_monitoring_ns [EXTRACTED 0.90]
- **Shared sed-based render-config initContainer pattern for templating domain placeholders across coredns-lan, dex, and grafana** — daemonset_render_config_initcontainer, dex_render_config_initcontainer, grafana_render_config_initcontainer [INFERRED 0.85]
- **Traefik TLS Certificate Issuance and Gateway Termination Flow** — traefik_certificate_yaml, homelab_ca_issuer, homelab_dev_tls_secret, traefik_websecure_listener, traefik_replacements_addons_domain [EXTRACTED 0.90]
- **ArgoCD Server Exposure via Gateway API HTTPRoute** — argocd_httproute, lan_gateway, argocd_server_service, traefik_gatewayclass [EXTRACTED 0.85]
- **ArgoCD App-of-Appsets Bootstrap Pattern** — argocd_root_application, addons_dir_appsets, appproject_platform, appproject_golf_application [INFERRED 0.75]
- **GitOps Bootstrap and Repo-Targeting Pattern (Pulumi + ArgoCD app-of-appsets + gitops-bridge)** — apply_argocd_bootstrap_manifests_via_pulumi_decision, use_app_of_appsets_gitops_pattern_decision, use_gitops_bridge_for_repo_targeting_decision, concept_pulumi, concept_argocd [EXTRACTED 0.90]
- **Build-and-Deploy CI/CD Pipeline (ARC trigger to Argo Events/Workflows/Rollouts)** — use_arc_as_trigger_bridge_only_decision, scope_arc_runners_per_repo_decision, use_argo_workflows_for_image_builds_decision, use_ghcr_for_container_registry_decision, commit_image_tags_back_to_git_decision, use_canary_with_manual_pause_for_rollouts_decision, run_single_replica_eventbus_jetstream_decision [EXTRACTED 0.90]
- **Homelab Networking, TLS, and Identity Pattern (domain, DNS, TLS, SSO)** — use_homelab_arpa_domain_decision, run_in_cluster_coredns_for_lan_dns_decision, use_self_signed_ca_for_internal_tls_decision, use_traefik_for_gateway_api_decision, use_standalone_dex_for_sso_decision [INFERRED 0.80]

## Communities (27 total, 6 thin omitted)

### Community 0 - "GitOps Platform Concepts"
Cohesion: 0.10
Nodes (44): Adding a New Project Workflow, ADR Index, Apply ArgoCD Bootstrap Manifests Directly via Pulumi, Architecture Overview, Commit Image Tag Bumps Back to Git, 1Password Kubernetes Operator, actions-runner-controller (ARC), Argo Events (+36 more)

### Community 1 - "Homelab Design Rationale"
Cohesion: 0.08
Nodes (38): AppProjects Namespace Enforcement Pattern, AGENT.md Architecture Reference, Rationale: Merged CA Bundle via SSL_CERT_FILE Instead of Replacing System Trust Store, Rationale: hostAliases on argocd-server Instead of Patching kube-system CoreDNS, Rationale: oidc-dex Secret Copied Not Second OnePasswordItem, Dex Config Init-Container sed Substitution Pattern, coredns-lan DNS Pattern for homelab.arpa, Domain Configuration Propagation Pattern (+30 more)

### Community 2 - "Pulumi Bootstrap Modules"
Cohesion: 0.08
Nodes (18): argocd, argocdUrl, domain, gatewayApi, gitopsBridge, onePassword, ArgoCd, ArgoCdInitOptions (+10 more)

### Community 3 - "Grafana Dashboards & Metrics"
Cohesion: 0.07
Nodes (34): Grafana dashboard: CI/CD (Argo Workflows/Events/Rollouts), Panel: CPU Usage by Namespace (aggregate), Panel: CPU Usage by Pod (container_cpu_usage_seconds_total), Panel: Memory Usage by Pod (container_memory_working_set_bytes), Panel: Pod Restarts (1h) (kube_pod_container_status_restarts_total), Panel: Pods by Namespace (kube_pod_status_phase), Panel: Argo Workflows Workflow Count by Phase (argo_workflows_count), Grafana dashboard: GolfApp (+26 more)

### Community 4 - "ARC Runner & Build Infra"
Cohesion: 0.09
Nodes (31): gha-runner-scale-set-controller Helm Chart, arc-controller base Kustomization, arc-runner-set Chart.yaml, arc-controller-gha-rs-controller ServiceAccount ref, gha-runner-scale-set Chart Dependency, OnePasswordItem arc-github-token (arc-runners), arc-runners base values.yaml, EventBus default (argo-events) (+23 more)

### Community 5 - "ArgoCD Bootstrap & Ingress"
Cohesion: 0.11
Nodes (21): addons/ Directory (addon-*-appset.yaml files), AppProject: golf-application, AppProject: platform, HTTPRoute: argocd, Application: root (ArgoCD App-of-Appsets), Service: argocd-server, HTTPRoute dex, Dex HTTPRoute config (dex.placeholder-domain via lan-gateway) (+13 more)

### Community 6 - "Pulumi npm Dependencies"
Cohesion: 0.13
Nodes (14): dependencies, @pulumi/command, @pulumi/kubernetes, @pulumi/pulumi, devDependencies, @types/node, typescript, main (+6 more)

### Community 7 - "ARC Controller & Runners Addons"
Cohesion: 0.16
Nodes (14): actions-runner-controller (upstream project), addon-arc-controller ApplicationSet, applications/arc-controller/base path, arc-systems namespace, platform ArgoCD project, addon-arc-runners ApplicationSet, arc-runners namespace, applications/arc-runners/onepassword-items source (+6 more)

### Community 8 - "GolfApp CI Runners & Repos"
Cohesion: 0.17
Nodes (13): github.com/atidyshirt/golf-ai-experiment (runner target repo), github.com/atidyshirt/golfapp-platform (runner target repo), golfapp-platform-runner-set (gha-runner-scale-set), golfapp-runner-set (gha-runner-scale-set), golfapp ApplicationSet, golf-canary Web info entry, golf-ai-experiment repo (source code), golf-application ArgoCD project (+5 more)

### Community 9 - "Project Template RBAC & Secrets"
Cohesion: 0.20
Nodes (11): 1Password Connect Helm Chart, Onepassword Operator Base Kustomization, Project Template Base Kustomization, Project Template RBAC Resource, Project Template Service Account Resource, RBAC Permission: argoproj.io rollouts, Role: default-restricted, RoleBinding: default-restricted (+3 more)

### Community 10 - "Argo Events/Workflows Addons"
Cohesion: 0.22
Nodes (10): addon-argo-events ApplicationSet, argo-events namespace, applications/argo-events/base path, argo-events (upstream project), addon-argo-workflows ApplicationSet, argo-workflows namespace, applications/argo-workflows/base path, argo-workflows (upstream project) (+2 more)

### Community 11 - "TypeScript Config"
Cohesion: 0.20
Nodes (9): compilerOptions, module, moduleResolution, outDir, skipLibCheck, strict, target, files (+1 more)

### Community 12 - "GHCR Pull Secret Provisioning"
Cohesion: 0.31
Nodes (9): arc-runners onepassword-items (shared ghcr-push item), argo-workflows base onepassword-items (shared ghcr-push item), Job ghcr-pull-secret, ghcr-pull-secret Kustomization, Secret ghcr-pull (docker-registry, ghcr.io), Role ghcr-pull-secret-writer, RoleBinding ghcr-pull-secret-writer, ServiceAccount ghcr-pull-secret-writer (+1 more)

### Community 13 - "Cert-Manager & Dex Addons"
Cohesion: 0.25
Nodes (8): addon-cert-manager ApplicationSet, cert-manager namespace, applications/cert-manager/base path, cert-manager (upstream project), addon-dex ApplicationSet, dex namespace, applications/dex/base path, dexidp/dex (upstream project)

### Community 14 - "Project Template & Traefik Addons"
Cohesion: 0.25
Nodes (8): addon-project-template ApplicationSet, Rationale: per-project defaults live under platform, one Application per project namespace not per project repo, applications/project-template/base path, addon-traefik ApplicationSet, traefik namespace, applications/traefik/base path, traefik/traefik (upstream project), automated selfHeal+prune syncPolicy with CreateNamespace/ServerSideApply

### Community 15 - "Home-Server Runner & CoreDNS Addon"
Cohesion: 0.29
Nodes (7): github.com/atidyshirt/home-server (runner target repo), home-server-runner-set (gha-runner-scale-set), addon-coredns-lan ApplicationSet, coredns-lan namespace, applications/coredns-lan/base path, CoreDNS (upstream project), addons_domain / addons_node_ip / addons_node_ip_v6 commonAnnotations

### Community 16 - "TLS Certificate Chain"
Cohesion: 0.29
Nodes (7): cert-manager Helm chart (jetstack v1.21.1), cert-manager Kustomization (helm chart + issuers.yaml), Rationale: tls_skip_verify_insecure for Dex OAuth token exchange (self-signed CA), Certificate homelab-ca, ClusterIssuer homelab-ca-issuer, Secret homelab-ca-secret, ClusterIssuer selfsigned-bootstrap

### Community 17 - "CoreDNS LAN Resources"
Cohesion: 0.60
Nodes (6): ConfigMap coredns-lan-corefile, ConfigMap coredns-lan-zones, coredns-lan Kustomization, coredns container (coredns/coredns:1.14.6), DaemonSet coredns-lan, render-config initContainer (sed template rendering)

### Community 18 - "Argo Rollouts Addon"
Cohesion: 0.40
Nodes (5): addon-argo-rollouts ApplicationSet, argo-rollouts namespace, applications/argo-rollouts/base path, argo-rollouts (upstream project), argo-rollouts Web UI info entry

### Community 19 - "Monitoring Addon"
Cohesion: 0.50
Nodes (5): addon-monitoring ApplicationSet, monitoring.stack.enabled=true cluster-label gate, kube-prometheus-stack helm chart (upstream), monitoring namespace, applications/monitoring/base path

### Community 20 - "Pulumi Bootstrap Package"
Cohesion: 0.67
Nodes (3): ARC Smoke Test Workflow, home-server-bootstrap Package, home-server-bootstrap Pulumi Project

## Ambiguous Edges - Review These
- `home-server-bootstrap Package` → `ARC Smoke Test Workflow`  [AMBIGUOUS]
  /Users/jordanp/projects/home-server/.github/workflows/arc-smoke-test.yml · relation: conceptually_related_to
- `monitoring.stack.enabled=true cluster-label gate` → `monitoring.stack.enabled=true cluster-label gate`  [AMBIGUOUS]
  /Users/jordanp/projects/home-server/addons/addon-monitoring-appset.yaml · relation: rationale_for
- `Grafana dashboard: GolfApp` → `Grafana auth.generic_oauth config (Dex client)`  [AMBIGUOUS]
  /Users/jordanp/projects/home-server/applications/monitoring/base/values.yaml · relation: conceptually_related_to

## Knowledge Gaps
- **137 isolated node(s):** `gatewayApi`, `argocd`, `gitopsBridge`, `onePassword`, `domain` (+132 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `home-server-bootstrap Package` and `ARC Smoke Test Workflow`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `monitoring.stack.enabled=true cluster-label gate` and `monitoring.stack.enabled=true cluster-label gate`?**
  _Edge tagged AMBIGUOUS (relation: rationale_for) - confidence is low._
- **What is the exact relationship between `Grafana dashboard: GolfApp` and `Grafana auth.generic_oauth config (Dex client)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `HTTPRoute grafana` connect `ArgoCD Bootstrap & Ingress` to `Grafana Dashboards & Metrics`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `monitoring Kustomization (kube-prometheus-stack)` connect `Grafana Dashboards & Metrics` to `ArgoCD Bootstrap & Ingress`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `clusters: {} generator pattern (all-clusters rollout)` (e.g. with `addon-arc-controller ApplicationSet` and `addon-arc-runners ApplicationSet`) actually correct?**
  _`clusters: {} generator pattern (all-clusters rollout)` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `addons_repo_url / addons_repo_revision cluster annotations` (e.g. with `addon-arc-controller ApplicationSet` and `addon-argo-events ApplicationSet`) actually correct?**
  _`addons_repo_url / addons_repo_revision cluster annotations` has 11 INFERRED edges - model-reasoned connections that need verification._