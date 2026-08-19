# Use a self-signed CA chain for internal TLS

## Status

Accepted

## Context

Services under `*.homelab.arpa` need real TLS encryption, but no public Certificate Authority
will issue a certificate for a private, non-routable domain — `homelab.arpa` will never pass a
CA's domain-ownership validation.

## Decision

cert-manager bootstraps a self-signed CA chain via sync waves: a `selfsigned-bootstrap`
`ClusterIssuer` (wave 1) issues the `homelab-ca` `Certificate` (wave 2, `isCA: true`), which
backs the `homelab-ca-issuer` `ClusterIssuer` (wave 3). Traefik's wildcard
`homelab-dev-tls` `Certificate`, issued by `homelab-ca-issuer`, backs the `websecure` Gateway
listener. Trusting the CA's public cert (never the private key) in an OS/browser keychain is a
manual, documented, per-client step.

## Alternatives Considered

- **Let's Encrypt via DNS-01 challenge**: rejected — would require exposing DNS control (or a
  public-facing DNS record) for a domain that's intentionally never meant to resolve publicly.
- **No TLS, plain HTTP internally**: rejected — credentials (OIDC tokens, session cookies) would
  cross the LAN in plaintext.
- **A commercial/internal CA product** (e.g. step-ca as a separate service): rejected — adds
  another stateful service to run and back up for the same result cert-manager's own
  self-signed-CA support already provides natively.

## Consequences

- Every new device/browser needs a manual one-time CA-trust step — not automatable from the
  cluster side, since it's inherently a client-side trust decision.
- The CA's private key existing in-cluster (as a cert-manager-managed `Secret`) is a real trust
  boundary — anyone with access to read that `Secret` can mint valid certs for any
  `*.homelab.arpa` hostname.
- Future improvement: rotate the root CA on a schedule (currently no expiry/rotation
  automation) once it's clearer how disruptive a rotation is for already-trusted clients.
