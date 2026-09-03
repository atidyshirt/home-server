#!/usr/bin/env bash
# Renders every applications/*/base with kustomize and validates the output with kubeconform.
set -euo pipefail

CRD_CATALOG='https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json'

# git sets GIT_DIR/GIT_WORK_TREE/etc. for the duration of hook execution so
# that hooks' own `git` invocations act on the commit in progress. kustomize
# shells out to `git` to fetch applications/argo-workflows/base's remote CRD
# directory, and if those variables leak through, that `git init` re-targets
# *this* repo's .git instead of kustomize's scratch clone dir - it then fails
# adding a remote named "origin" because this repo already has one. Unset
# them so kustomize's git operations are self-contained.
unset "${!GIT_@}"

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

  # kubeconform's YAML decoder is unreliable on very large multi-document
  # streams fed via stdin: piping argo-workflows' ~190k-line rendered CRDs
  # into one kubeconform invocation produces non-deterministic bogus parse
  # errors (different bogus "could not find expected ':'"/duplicate-key
  # errors, on different CRDs, on different runs of the exact same input -
  # even single-threaded). Each resource validates fine on its own, and
  # kubeconform reads file arguments independently (unlike stdin, which it
  # decodes as one continuous stream), so split the rendered output into
  # one file per document first to sidestep the bug.
  splitdir="$(mktemp -d)"
  trap 'rm -rf "$splitdir"' EXIT
  $render | yq -s "\"$splitdir/doc-\" + \$index" -

  if ! kubeconform \
    -strict -summary \
    -schema-location default \
    -schema-location "$CRD_CATALOG" \
    -ignore-missing-schemas \
    "$splitdir"/*; then
    status=1
  fi
  rm -rf "$splitdir"
  trap - EXIT
done

exit $status
