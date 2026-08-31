#!/usr/bin/env bash
set -euo pipefail

# Stopping the VM alone is enough - the Pi's node-monitor-grace-period (~40s) marks the
# node NotReady and tolerationSeconds (~300s default) evicts its pods back onto the Pi,
# no explicit `k0s reset`/decommission needed for routine disconnects.
#
# Usage: leave.sh [--delete]   (--delete fully removes the VM instead of just stopping it)

VM_NAME="k0s-laptop-worker"

if [[ "${1:-}" == "--delete" ]]; then
  limactl delete --force "${VM_NAME}"
else
  limactl stop "${VM_NAME}"
fi
