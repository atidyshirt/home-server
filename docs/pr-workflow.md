# PR Workflow

## Testing a branch before merging

By default every addon deploys from `main`. To point the whole tree at a branch instead:

```bash
pulumi config set argocd:gitRevision <branch-name>
PULUMI_CONFIG_PASSPHRASE=<your passphrase> pulumi up
```

Switch back once you're done:

```bash
pulumi config set argocd:gitRevision main
```

> [!IMPORTANT]
> `argocd:gitRevision` is a required config value (no default in code) — `pulumi config rm` it
> and `pulumi up` will fail rather than silently falling back to `main`.

This works because every `addon-*-appset.yaml` reads its `repoURL`/`targetRevision` from the
`in-cluster` Secret's annotations rather than hardcoding `main` — see
[AGENT.md](../AGENT.md#pinning-a-revision-gitops-bridge-pattern) for how.

## Adding a new app

Add `applications/<name>/base/kustomization.yaml` (+ `values.yaml` if wrapping a Helm chart,
+ an `HTTPRoute` for `<name>.homelab.dev`) and push. `addon-applications-appset.yaml` picks it
up automatically — no new ApplicationSet, no new DNS record needed (wildcard). Deployed into a
namespace named `<name>` (auto-created).

Need a secret? Reference a 1Password item via a `OnePasswordItem` resource — see
`applications/onepassword-operator/`.

Need the domain (`homelab:domain`)? Add the same `source.kustomize.commonAnnotations` block
every other appset has (copy one) — it stamps `addons_domain` onto your app's resources. From
there it's up to your `kustomization.yaml` to consume it: kustomize `replacements` for
structured fields, or a Downward-API-fed init container for free text — see
[AGENT.md](../AGENT.md#domain-configuration).

> [!NOTE]
> The Gateway's `web` listener allows routes from every namespace, not just its own (Gateway
> API's default) — your `HTTPRoute` will attach regardless of which namespace it lives in.
