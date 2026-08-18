Be Terse.

**Repo Description**

Applicationset repo designed to store applicationsets to deploy to a local k0s cluster.
Public repo: github.com/atidyshirt/home-server — no secrets are ever committed.

**Structure**

```
bootstrap/argocd/           # root Application ("app of appsets") + ArgoCD's own HTTPRoute
addons/
    addon-*-appset.yaml      # one ApplicationSet per curated infra addon
    <addon>/base/            # kustomization.yaml (+ values.yaml if wrapping a helm chart)
applications/
    <name>/base/             # auto-registered by addon-applications-appset.yaml (git directories generator)
```

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
`onepassword:serviceAccountToken`, `argocd:version` (optional), `gatewayapi:version`
(optional). `gitRevision` and `gitRepoUrl` stay unnamespaced/project-level since both `ArgoCd`
and `GitopsBridge` read them independently.

**Pinning a revision (gitops-bridge pattern)**

`addon-*-appset.yaml` use ArgoCD's Cluster generator, not hardcoded `targetRevision: main`.
Pulumi registers the local cluster as a Secret (`argocd.argoproj.io/secret-type: cluster`,
name `in-cluster`) with `addons_repo_url`/`addons_repo_revision` annotations; every
appset's template reads `{{metadata.annotations.addons_repo_revision}}`. To point
everything at a PR branch instead of main:
`pulumi config set gitRevision <branch>` then `pulumi up` (see provisioning/pulumi/README
or README.md). `addon-applications-appset.yaml` uses a Matrix generator (clusters x git
directories) so the same pinning applies to app auto-discovery too. `root-app.yaml` itself
is templated directly by Pulumi (it's the one file Pulumi applies, not ArgoCD-generated).

**Secrets**

All credentials flow through the 1Password Kubernetes Operator via `OnePasswordItem` CRDs.
The only credential handled outside of 1Password is the operator's own Service Account
token, created directly by Pulumi as a Kubernetes Secret (never committed).

**DNS**

LAN hostnames resolve under `homelab.dev` via an in-cluster CoreDNS addon (wildcard
`*.homelab.dev` -> node IP, hostNetwork on port 53). Not the network's primary DNS — the
router gets one manual conditional-forwarding rule for the `homelab.dev` zone. See
README.md for the manual steps.

The Pi previously ran Pi-hole (`pihole-FTL`, installed 2026-06-16) bound to port 53,
which conflicted with coredns-lan. Disabled (`systemctl disable --now pihole-FTL`) in
favor of coredns-lan — not reinstalled by this repo, so re-provisioning a fresh Pi
won't need this step, but re-imaging *this* Pi from a backup might.

**Gateway API implementation**

Traefik, not Envoy Gateway. Envoy's bundled TCMalloc assumes a 48-bit virtual address
space and hard-crashes (`MmapAligned() failed`) on this Pi's aarch64 kernel, which
appears to use 39-bit VA — not fixable via config, it's a compile-time constant in the
binary. Traefik (Go, no TCMalloc) doesn't have this problem.

**Documentation**

Be extremely concise and to the point. Avoid unnecessary words or explanations. Use bullet points for clarity.

**Deployment**

A raspberry pi is accessable from `ssh clusteradmin@home-server.local`. This is a role you are allowed
to use. Node LAN IP: `192.168.1.146` (should be a DHCP reservation — see README.md).
