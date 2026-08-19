# Use homelab.arpa as the internal domain

## Status

Accepted

## Context

The homelab needs an internal domain for LAN-only services (`*.<domain>`) that isn't a real
publicly-resolvable domain, but still needs to work cleanly with browsers over HTTPS using a
private CA.

## Decision

Use `homelab.arpa` — IANA's infrastructure top-level domain, reserved for exactly this kind of
private/technical use and not present in any browser's HSTS preload list.

## Alternatives Considered

- **A `.dev` subdomain** (e.g. `homelab.dev`): rejected — `.dev` is entirely HSTS-preloaded by
  Chrome/Firefox/Safari, meaning every browser forces HTTPS for it with zero configuration
  option to opt out, and there's no real public CA that will issue a cert for a private,
  non-routable domain.
- **A `.local` domain**: rejected — collides with mDNS/Bonjour's reserved use of `.local`,
  which most OSes resolve via multicast DNS rather than a configured DNS server, making a real
  CoreDNS-backed setup unreliable.
- **A registered public domain used privately** (e.g. an owned `.com`/`.net`): rejected — costs
  money and DNS management overhead for a domain that's never meant to resolve publicly.

## Consequences

- No HSTS conflicts; a self-signed CA (see the internal-TLS ADR) is sufficient and browsers can
  be configured to trust it per-client without fighting a preload list.
- `.arpa` is an unusual choice that isn't immediately recognizable to someone unfamiliar with
  IANA's special-use domains — worth the one-line explanation anywhere it's first introduced.
- Future improvement: none currently planned — `.arpa` fully solves the problem this ADR exists
  to address.
