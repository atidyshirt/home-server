Be Terse.

**Repo Description**

Applicationset repo designed to store applicationsets to deploy to a local k0s cluster.
Public repo: github.com/atidyshirt/home-server — no secrets are ever committed.

**Structure**

```
bootstrap/argocd/           # root Application ("app of appsets") + ArgoCD's own HTTPRoute
addons/
    addon-*-appset.yaml      # ApplicationSets only — no content lives here
applications/
    <name>/base/             # kustomization.yaml (+ values.yaml if wrapping a helm chart) — ALL
                              #   content for every app lives here
```

Every app (curated addon or otherwise) gets its own `addon-*-appset.yaml` in `addons/` pointing
at `applications/<name>/base`. No auto-discovery generator — every app is explicit.

**Provisioning**

```
provisioning/pulumi/
    index.ts                     # 4 lines of orchestration: install() every module, ArgoCd.init() last
    src/
        kubernetesProvider.ts    # interface KubernetesProvider — ready, provider, applyManifest()
        raspberryPiK0s.ts        # class RaspberryPiK0s implements KubernetesProvider
                                  #   + getKubernetesProvider(): memoized singleton, reads "raspberrypi" config
        gatewayApi.ts             # class GatewayApi extends pulumi.ComponentResource
        argocd.ts                # class ArgoCd extends pulumi.ComponentResource
                                  #   install(): argocd-cm/argocd-cmd-params-cm patches
                                  #   init(): applies bootstrap/argocd/root-app.yaml + httproute.yaml
        gitopsBridge.ts          # class GitopsBridge extends pulumi.ComponentResource — the in-cluster Secret
        onePassword.ts           # class OnePassword extends pulumi.ComponentResource — reads its own
                                  #   "onepassword" config for the bootstrap Service Account token
```

Every module is a `pulumi.ComponentResource` with a memoized `static install()` (`ArgoCd` also
has `static init()`). Each module is self-contained: it calls `getKubernetesProvider()` and
reads its own config internally rather than taking them as constructor args. Dependencies
between modules are expressed by passing the *module itself* as `dependsOn` —
`GitopsBridge.install({ dependsOn: argocd })` — not a manually-captured resource handle,
because Pulumi resolves a `ComponentResource` dependency against everything parented under it
(`parent: this` on every child resource each module creates).

`index.ts` is just: `GatewayApi.install()`, `ArgoCd.install()`,
`GitopsBridge.install({ dependsOn: argocd })`, `OnePassword.install()`, then
`ArgoCd.init({ dependsOn: [gatewayApi, gitopsBridge, onePassword] })` last, since `init()` (the
hand-off — applies `root-app.yaml` + `httproute.yaml`) needs those three already installed. From
there, ArgoCD reads this repo directly (`addons/addon-*-appset.yaml`).

The `argocd`/`onepassword` `Namespace`s are `protect: true` — a Kubernetes namespace delete
cascades to everything inside it (every ArgoCD-managed `Application` CR lives in the `argocd`
namespace), so a `pulumi down`/replace of either is destructive far beyond "recreate a
namespace." Pulumi refuses to delete a protected resource; `pulumi state unprotect` is required
first if that's ever genuinely intended.

`KubernetesProvider` is the seam for swapping k0s out later — an implementation only needs to
provide `ready`, a `@pulumi/kubernetes` `Provider`, and `applyManifest()`.
`RaspberryPiK0s.applyManifest()` shells out over SSH to `k0s kubectl` rather than using
`@pulumi/kubernetes`'s own YAML resources — large manifests (ArgoCD's install.yaml) were
silently dropped through those. `ArgoCd`/`GitopsBridge`/`OnePassword`/`GatewayApi` are written
against the interface, not `RaspberryPiK0s`, so none of them need to change if the
implementation does.

Config is namespaced per module: `raspberrypi:sshHost`/`sshUser`/`nodeLanIp`,
`onepassword:serviceAccountToken`, `argocd:version`, `gatewayapi:version`,
`argocd:gitRevision`/`argocd:gitRepoUrl` (`ArgoCd` and `GitopsBridge` each read the latter two
independently, but they're grouped under `argocd:` rather than each module's own namespace
since they're conceptually "what ArgoCD tracks", not module-specific), `homelab:domain`. All
config is required (`.require()`, never `.get() ?? default`) — every value lives in
`Pulumi.homelab.yaml`, not as a fallback baked into the code.

**Pinning a revision (gitops-bridge pattern)**

`addon-*-appset.yaml` use ArgoCD's Cluster generator, not hardcoded `targetRevision: main`.
Pulumi registers the local cluster as a Secret (`argocd.argoproj.io/secret-type: cluster`,
name `in-cluster`) with `addons_repo_url`/`addons_repo_revision` annotations; every
appset's template reads `{{metadata.annotations.addons_repo_revision}}`. To point
everything at a PR branch instead of main: `pulumi config set argocd:gitRevision <branch>`
then `pulumi up` — see [docs/pr-workflow.md](docs/pr-workflow.md). `root-app.yaml` itself is
templated directly by Pulumi (it's the one file Pulumi applies, not ArgoCD-generated).

**Domain configuration**

`homelab:domain` (Pulumi config) flows into the same `in-cluster` Secret as `addons_domain`,
alongside `addons_repo_url`/`addons_repo_revision`. Every `addon-*-appset.yaml` template sets
`source.kustomize.commonAnnotations: {addons_domain: '{{metadata.annotations.addons_domain}}'}`
— a generic, uniform pattern across every appset, regardless of whether that addon needs the
domain. Each app then decides internally how to consume the annotation kustomize stamped onto
its resources:
- Structured fields (e.g. a `Certificate`'s `spec.dnsNames`) use kustomize `replacements`
  sourced from the resource's own `metadata.annotations.addons_domain` — see
  `applications/traefik/base/kustomization.yaml`.
- Free-text blobs with the domain embedded multiple times (e.g. CoreDNS's Corefile/zone file)
  can't be patched that way — kustomize has no generic string substitution. Instead the pod
  template's `addons_domain` annotation (kustomize's `commonAnnotations` also propagates into
  `spec.template.metadata` for workloads) is read via the Downward API into an env var, and an
  init container `sed`s a `PLACEHOLDER_DOMAIN` token in a template ConfigMap into a shared
  `emptyDir` at startup — see `applications/coredns-lan/base/deployment.yaml`.

Every domain-dependent base manifest carries a literal placeholder value (`placeholder-domain`
/ `PLACEHOLDER_DOMAIN`) so `kustomize build --enable-helm` succeeds standalone without the
appset's runtime override — `commonAnnotations` always wins over a resource's pre-existing
annotation of the same key, confirmed empirically (`kustomize edit add annotation` upserts
rather than erroring, as long as the *base* kustomization.yaml itself doesn't already declare
that key in its own `commonAnnotations`).

`bootstrap/argocd/root-app.yaml` and `httproute.yaml` aren't ArgoCD-managed (Pulumi applies
them directly), so they use `__GIT_REPO_URL__`/`__GIT_REVISION__`/`__DOMAIN__` placeholders
that `ArgoCd.applyRootApp()` string-replaces directly, the same technique as the appset
annotations but done in TypeScript since ArgoCD's templating engine never sees these two files.

**Secrets**

All credentials flow through the 1Password Kubernetes Operator via `OnePasswordItem` CRDs.
The only credential handled outside of 1Password is the operator's own Service Account
token, created directly by Pulumi as a Kubernetes Secret (never committed). The
`onepassword-operator` addon patches the upstream `config/default` base to use that Service
Account token (`OP_SERVICE_ACCOUNT_TOKEN`) instead of the default Connect-server flow.

**DNS**

LAN hostnames resolve under `homelab.arpa` via an in-cluster CoreDNS addon (wildcard
`*.homelab.arpa` -> node IP, hostNetwork on port 53). Not the network's primary DNS — the
router gets one manual conditional-forwarding rule for the `homelab.arpa` zone. See
[docs/provisioning.md](docs/provisioning.md) for the manual steps.

The Pi previously ran Pi-hole (`pihole-FTL`, installed 2026-06-16) bound to port 53,
which conflicted with coredns-lan. Disabled (`systemctl disable --now pihole-FTL`) in
favor of coredns-lan — not reinstalled by this repo, so re-provisioning a fresh Pi
won't need this step, but re-imaging *this* Pi from a backup might.

**TLS**

The domain used to be `homelab.dev` — browsers HSTS-preload the entire `.dev` TLD, forcing
HTTPS with no real cert authority for a private domain. Switched to `homelab.arpa` (IANA's
infrastructure TLD, not preloaded) to remove that problem at the root, but the self-signed CA
built to solve it stayed since it's already useful for real encryption. cert-manager
(`applications/cert-manager/base`) bootstraps the chain via sync waves: `selfsigned-bootstrap`
`ClusterIssuer` (wave 1) issues the `homelab-ca` `Certificate` (wave 2, `isCA: true`), which
backs the `homelab-ca-issuer` `ClusterIssuer` (wave 3). Traefik's wildcard `homelab-dev-tls`
`Certificate` (in the `traefik` namespace, issued by `homelab-ca-issuer`) backs a `websecure`
Gateway listener on port 443. Trusting the CA's public cert (never the private key) in an
OS/browser keychain is a manual, per-client step — not automatable from here.

**Gateway API implementation**

Traefik, not Envoy Gateway. Envoy's bundled TCMalloc assumes a 48-bit virtual address
space and hard-crashes (`MmapAligned() failed`) on this Pi's aarch64 kernel, which
appears to use 39-bit VA — not fixable via config, it's a compile-time constant in the
binary. Traefik (Go, no TCMalloc) doesn't have this problem. Runs as root (uid 0, no
capability restrictions) — two non-root approaches (`NET_BIND_SERVICE`,
`allowPrivilegeEscalation`) failed identically binding port 80 for reasons that trace to
something below the Kubernetes API, not the manifest (ATI-32).

**Documentation**

Be extremely concise and to the point. Avoid unnecessary words or explanations. Use bullet
points for clarity. Docs (this file, `docs/*.md`) cover patterns and workflows — not
implementation details, which live in the code and rot fast if duplicated in prose.

**Code comments**

None — names and structure carry the meaning. Non-trivial context belongs in the Linear issue
for that change (this project has one per fix already) or, if it's a reusable pattern, here.
If something is genuinely undiscoverable from code + these docs, use a Kubernetes `annotation`
linking to the doc/issue rather than a comment — none needed yet, this project is too early for
anything to have earned one.

**Deployment**

A raspberry pi is accessable from `ssh clusteradmin@home-server.local`. This is a role you are allowed
to use. Node LAN IP: `192.168.1.146` (should be a DHCP reservation — see
[docs/provisioning.md](docs/provisioning.md)).
