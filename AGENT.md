Be Terse.

**Repo Description**

Applicationset repo designed to store applicationsets to deploy to a local k0s cluster.

**Structure**

```
bootstrap/argocd
addons/
    addon-*-appset.yaml
applications/
    */base/values.yaml
    */base/kustomization.yaml
```

**Provisioning Steps**

I am open to using some IaC tool for this, but want something simple enough, not terraform.
It would be ideal to have this system s.t I could switch from k0s to something else in future.

```
k0sctl
   │
   └── creates k0s
          │
          └── bootstrap Argo CD
                    │
                    └── Argo reads GitOps repo
                              │
                              ├── infrastructure
                              ├── ApplicationSets
                              └── applications
```

**Documentation**

Be extremely consise and to the point. Avoid unnecessary words or explanations. Use bullet points for clarity.

**Deployment**

A raspberry pi is accessable from `ssh clusteradmin@home-server.local`. This is a role you are allowed
to use. This pi has `kubectl` access configured via `~/.kube/config`.
