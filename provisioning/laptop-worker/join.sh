#!/usr/bin/env bash
set -euo pipefail

# Run manually, on the laptop, whenever the user wants it contributing compute for a
# session. Not driven by Pulumi - see docs/adr/add-transient-laptop-worker-node.md for why.

VM_NAME="k0s-laptop-worker"
PI_SSH="clusteradmin@home-server.local"
# Must match raspberrypi:nodeLanIpV6 in provisioning/pulumi/Pulumi.homelab.yaml - the Pi's
# Tailscale 4via6 address, reachable regardless of which physical network the laptop is on.
PI_TAILSCALE_IP="fd7a:115c:a1e0:b1a:0:1:c0a8:192"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v orbctl >/dev/null 2>&1; then
  echo "orbctl not found - install OrbStack first (https://orbstack.dev)" >&2
  exit 1
fi

if ! orbctl list -q 2>/dev/null | grep -qx "${VM_NAME}"; then
  orbctl create --cpus 2 --memory 4G --disk 20G -c "${SCRIPT_DIR}/cloud-init.yaml" ubuntu:noble "${VM_NAME}"
fi
# A stopped-but-existing machine is brought up implicitly by the first `orbctl run` below
# (OrbStack machines auto-start on access) - no separate `orbctl start` subcommand exists.

if ! orbctl run -m "${VM_NAME}" sudo tailscale status >/dev/null 2>&1; then
  echo "Authorize this VM in your tailnet:"
  orbctl run -m "${VM_NAME}" sudo tailscale up --accept-dns=false
fi

TS_IP="$(orbctl run -m "${VM_NAME}" sudo tailscale ip -4)"
echo "VM Tailscale IP: ${TS_IP}"

if orbctl run -m "${VM_NAME}" sudo k0s status >/dev/null 2>&1; then
  echo "k0s worker already running on ${VM_NAME}, nothing to do"
  exit 0
fi

# Worker tokens are a base64-encoded bootstrap kubeconfig pointing at the join API (port
# 9443). Minted fresh on the Pi's LAN address each time, then rewritten to the Pi's
# Tailscale address - the laptop may not be on the Pi's LAN at all when this runs.
RAW_TOKEN="$(ssh "${PI_SSH}" "sudo k0s token create --role=worker --expiry=1h")"
REWRITTEN_TOKEN="$(echo "${RAW_TOKEN}" | base64 -d \
  | sed -E "s#https://[^:]+:9443#https://[${PI_TAILSCALE_IP}]:9443#" \
  | base64)"

echo "${REWRITTEN_TOKEN}" | orbctl run -m "${VM_NAME}" sudo tee /etc/k0s/worker-token >/dev/null

orbctl run -m "${VM_NAME}" sudo k0s install worker \
  --token-file=/etc/k0s/worker-token \
  --kubelet-extra-args="--node-ip=${TS_IP} --node-labels=node-role.homelab/tier=transient --register-with-taints=node-role.homelab/tier=transient:NoSchedule"

orbctl run -m "${VM_NAME}" sudo k0s start

for i in $(seq 1 30); do
  if orbctl run -m "${VM_NAME}" sudo k0s status >/dev/null 2>&1; then
    echo "k0s worker is up on ${VM_NAME} (node-ip ${TS_IP})"
    exit 0
  fi
  sleep 2
done

echo "k0s worker did not come up in time" >&2
exit 1
