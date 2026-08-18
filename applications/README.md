# applications

Each subdirectory here becomes an ArgoCD Application automatically — see
`addons/addon-applications-appset.yaml`, a git-directories generator over
`applications/*/base`. No new ApplicationSet needed per app.

To add a new app:

```
applications/<name>/base/kustomization.yaml
applications/<name>/base/values.yaml      # if wrapping a Helm chart
applications/<name>/base/httproute.yaml   # <name>.homelab.dev — no DNS record needed (wildcard)
```

Deployed into a namespace named `<name>` (auto-created). Need a secret? Reference a
1Password item via a `OnePasswordItem` resource — see `addons/onepassword-operator/`.
