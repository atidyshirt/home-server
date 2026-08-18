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
Pulumi (TypeScript, provisioning/pulumi/)
   │  minimal, one-time bootstrap — only what ArgoCD can't do for itself
   ├── ensures k0s is present on the Pi (no-op today, codifies it for rebuilds)
   ├── installs Gateway API CRDs
   ├── installs ArgoCD + patches argocd-cm/argocd-cmd-params-cm
   ├── creates ONE secret: the 1Password Service Account token
   └── applies bootstrap/argocd/root-app.yaml + httproute.yaml
          │
          └── ArgoCD reads this repo from here on:
                    ├── addons/addon-traefik-appset.yaml           (Gateway API impl, hostNetwork:80)
                    ├── addons/addon-coredns-lan-appset.yaml       (*.homelab.dev -> node IP)
                    ├── addons/addon-onepassword-operator-appset.yaml
                    └── addons/addon-applications-appset.yaml      (applications/*/base, auto-discovered)
```

Kept deliberately swappable: if k0s is replaced later, only the Pulumi bootstrap changes —
the addons/applications layer is untouched.

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
