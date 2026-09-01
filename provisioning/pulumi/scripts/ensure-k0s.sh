#!/usr/bin/env bash
set -euo pipefail

if sudo k0s status >/dev/null 2>&1; then
  echo "k0s already running, nothing to do"
  exit 0
fi

curl -sSLf https://get.k0s.sh | sudo sh

# The API server's advertise address (spec.api.address) is what gets embedded in the
# in-cluster `kubernetes` Service's Endpoints (used by every pod for in-cluster API
# access, e.g. Argo Workflows' wait sidecar reporting status) and in freshly-minted
# worker join tokens. k0s defaults this to the node's auto-detected LAN IP, which
# breaks both for any node/pod only reachable over Tailscale (like the laptop worker) -
# confirmed live: pods there got "dial tcp 192.168.1.146:6443: i/o timeout" trying to
# reach the kubernetes Service, since the Pi deliberately never advertises its LAN
# subnet over Tailscale (subnet-collision avoidance, see docs/provisioning.md).
# Advertising the Pi's own Tailscale IP instead makes it reachable from anywhere on
# the tailnet; pods on the Pi itself keep working fine too, looping back through its
# own tailscale0 interface. Both addresses stay in `sans` so the cert stays valid for
# LAN-direct access too (Pulumi's own kubeconfig, docs/provisioning.md's SSH-based
# kubectl commands, this repo's own ~/.kube config, etc.) - `spec.api.address` alone
# doesn't restrict what interface the server binds to, only what's advertised/default.
#
# Requires Tailscale already up on the Pi - now a prerequisite of this bootstrap step
# (see docs/provisioning.md), not a manual step done after it.
TAILSCALE_IP="$(tailscale ip -4)"

# kube-router's default MTU assumes a plain LAN uplink; the pod overlay also has to fit
# inside the laptop worker's Tailscale tunnel (~1280 MTU) once it joins, so it's fixed
# below the tunnel's ceiling here, once, for every node - not something to leave on
# k0s's LAN-assuming autoMTU default.
sudo mkdir -p /etc/k0s
cat <<EOF | sudo tee /etc/k0s/k0s.yaml >/dev/null
apiVersion: k0s.k0sproject.io/v1beta1
kind: ClusterConfig
metadata:
  name: k0s
spec:
  api:
    address: ${TAILSCALE_IP}
    sans:
      - ${NODE_LAN_IP}
      - ${TAILSCALE_IP}
  network:
    kuberouter:
      autoMTU: false
      mtu: 1200
EOF

sudo k0s install controller --enable-worker --no-taints -c /etc/k0s/k0s.yaml
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
