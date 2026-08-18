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
                    ├── addons/addon-envoy-gateway-appset.yaml     (Gateway API impl, hostNetwork:80)
                    ├── addons/addon-coredns-lan-appset.yaml       (*.homelab.dev -> node IP)
                    ├── addons/addon-onepassword-operator-appset.yaml
                    └── addons/addon-applications-appset.yaml      (applications/*/base, auto-discovered)
```

Kept deliberately swappable: if k0s is replaced later, only the Pulumi bootstrap changes —
the addons/applications layer is untouched.

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

**Documentation**

Be extremely concise and to the point. Avoid unnecessary words or explanations. Use bullet points for clarity.

**Deployment**

A raspberry pi is accessable from `ssh clusteradmin@home-server.local`. This is a role you are allowed
to use. Node LAN IP: `192.168.1.146` (should be a DHCP reservation — see README.md).
