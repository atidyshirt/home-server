#!/usr/bin/env bash
# Renders every applications/*/base with kustomize and validates the output with kubeconform.
set -euo pipefail

CRD_CATALOG='https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json'

status=0
for dir in applications/*/base; do
  app="${dir#applications/}"
  app="${app%/base}"
  echo "== $app =="

  if [ -f "$dir/kustomization.yaml" ] || [ -f "$dir/kustomization.yml" ]; then
    render="kustomize build --enable-helm $dir"
  elif [ -f "$dir/Chart.yaml" ]; then
    # A directory like applications/arc-runners/base is a vendored Helm chart
    # consumed directly by ArgoCD's Helm source, not wrapped in a kustomization.
    render="helm template $dir"
  else
    echo "no kustomization.yaml or Chart.yaml in $dir" >&2
    status=1
    continue
  fi

  if ! $render | kubeconform \
    -strict -summary \
    -schema-location default \
    -schema-location "$CRD_CATALOG" \
    -ignore-missing-schemas; then
    status=1
  fi
done

exit $status
