#!/usr/bin/env bash
# Idempotent: installs a single-node k0s controller+worker if it isn't already running.
# Codifies today's manual setup so a rebuild (or a different Pi) is one command.
set -euo pipefail

if sudo k0s status >/dev/null 2>&1; then
  echo "k0s already running, nothing to do"
  exit 0
fi

curl -sSLf https://get.k0s.sh | sudo sh
sudo k0s install controller --single
sudo k0s start

for i in $(seq 1 30); do
  if sudo k0s kubectl get --raw=/readyz >/dev/null 2>&1; then
    echo "k0s is ready"
    exit 0
  fi
  sleep 2
done

echo "k0s did not become ready in time" >&2
exit 1
