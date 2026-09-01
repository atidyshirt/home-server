#!/usr/bin/env bash
set -euo pipefail

# Run manually, on the laptop, whenever the user wants it contributing compute for a
# session. Not driven by Pulumi - see docs/adr/add-transient-laptop-worker-node.md for why.

VM_NAME="k0s-laptop-worker"
PI_SSH="clusteradmin@home-server.local"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Without this, some shell/agent setups only offer the first configured identity and
# never fall through to an agent-forwarded key (e.g. 1Password's SSH agent) - confirmed
# live as a "Permission denied (publickey,password)" failure that plain `ssh-add -l`
# showed a usable key for.
SSH_PI=(ssh -o IdentitiesOnly=no "${PI_SSH}")

# Deliberately the Pi's own Tailscale IP, not its 4via6 address (raspberrypi:nodeLanIpV6) -
# confirmed via a live join attempt that the k0s API server's TLS cert SANs only cover
# addresses actually bound to a Pi interface (LAN IP, loopback, and the Pi's own tailscale0
# IPv4/IPv6), not the 4via6 address, which is a *routed* address never bound to any interface
# on the Pi itself. The 4via6 route exists to solve a different problem entirely (LAN-subnet
# collision avoidance for coredns-lan's A/AAAA records, see docs/adr) - the Pi's own Tailscale
# IP is simpler and already collision-free for this join, so use that instead. Fetched live
# rather than hardcoded since it's not otherwise tracked anywhere in this repo.
PI_TAILSCALE_IP="$("${SSH_PI[@]}" "tailscale ip -4")"

if ! command -v limactl >/dev/null 2>&1; then
  echo "limactl not found - install Lima first (e.g. via the dotfiles' nix packages)" >&2
  exit 1
fi

if limactl list --format '{{.Name}} {{.Status}}' 2>/dev/null | grep -q "^${VM_NAME} Running$"; then
  echo "${VM_NAME} already running"
else
  # Lima >=2.1 dropped the old `start template://X overlay.yaml` two-positional-arg
  # merge in favor of composing templates via a `base:` field inside a single YAML
  # (see lima.yaml's own `base: [template:ubuntu-lts]`).
  limactl start --name="${VM_NAME}" --tty=false "${SCRIPT_DIR}/lima.yaml"
fi

if ! limactl shell "${VM_NAME}" sudo tailscale status >/dev/null 2>&1; then
  echo "Authorize this VM in your tailnet:"
  limactl shell "${VM_NAME}" sudo tailscale up --accept-dns=false
fi

TS_IP="$(limactl shell "${VM_NAME}" sudo tailscale ip -4)"
echo "VM Tailscale IP: ${TS_IP}"

if limactl shell "${VM_NAME}" sudo k0s status >/dev/null 2>&1; then
  echo "k0s worker already running on ${VM_NAME}, nothing to do"
  exit 0
fi

# Worker tokens are base64(gzip(bootstrap kubeconfig)) pointing at the join API on port
# 6443 (the standard kube-apiserver port - not 9443, confirmed from a live token's actual
# contents; k0s's join-token docs are ambiguous on this and 9443 was a wrong assumption
# during initial development, caught by a live join failing "illegal base64 data" until the
# missing gunzip/gzip round-trip was added, then TLS-cert-SAN-mismatch until the address
# above was fixed). Minted fresh on the Pi's LAN address each time, then rewritten to the
# Pi's Tailscale address - the laptop may not be on the Pi's LAN at all when this runs.
RAW_TOKEN="$("${SSH_PI[@]}" "sudo k0s token create --role=worker --expiry=1h")"
REWRITTEN_TOKEN="$(echo "${RAW_TOKEN}" | base64 -d | gunzip \
  | sed -E "s#https://[0-9.]+:6443#https://${PI_TAILSCALE_IP}:6443#" \
  | gzip | base64)"

limactl shell "${VM_NAME}" sudo mkdir -p /etc/k0s
echo "${REWRITTEN_TOKEN}" | limactl shell "${VM_NAME}" sudo tee /etc/k0s/worker-token >/dev/null

limactl shell "${VM_NAME}" sudo k0s install worker \
  --token-file=/etc/k0s/worker-token \
  --kubelet-extra-args="--node-ip=${TS_IP} --node-labels=node-role.homelab/tier=transient --register-with-taints=node-role.homelab/tier=transient:NoSchedule"

limactl shell "${VM_NAME}" sudo k0s start

for i in $(seq 1 30); do
  if limactl shell "${VM_NAME}" sudo k0s status >/dev/null 2>&1; then
    echo "k0s worker is up on ${VM_NAME} (node-ip ${TS_IP})"
    exit 0
  fi
  sleep 2
done

echo "k0s worker did not come up in time" >&2
exit 1
