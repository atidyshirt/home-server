#!/usr/bin/env bash
set -euo pipefail

if sudo k0s status >/dev/null 2>&1; then
  echo "k0s already running, nothing to do"
  exit 0
fi

curl -sSLf https://get.k0s.sh | sudo sh

# kube-router's default MTU assumes a plain LAN uplink; the pod overlay also has to fit
# inside the laptop worker's Tailscale tunnel (~1280 MTU) once it joins, so it's fixed
# below the tunnel's ceiling here, once, for every node - not something to leave on
# k0s's LAN-assuming autoMTU default.
sudo mkdir -p /etc/k0s
cat <<'EOF' | sudo tee /etc/k0s/k0s.yaml >/dev/null
apiVersion: k0s.k0sproject.io/v1beta1
kind: ClusterConfig
metadata:
  name: k0s
spec:
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
