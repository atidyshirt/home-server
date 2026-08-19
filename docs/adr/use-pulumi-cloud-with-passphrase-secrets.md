# Use Pulumi Cloud as the state backend, keep the passphrase secrets provider

## Status

Accepted

## Context

Pulumi state (the record of every provisioned resource) needs to live somewhere durable,
ideally with locking to prevent concurrent `pulumi up` runs from corrupting it, and ideally
backed up somewhere other than a single machine's local disk.

## Decision

Use Pulumi Cloud (the free tier, individual use) as the state backend, but explicitly keep the
`passphrase` secrets provider (`pulumi stack init --secrets-provider passphrase`) rather than
switching to Pulumi Cloud's own service-managed encryption. The `encryptionsalt` lives in the
committed `Pulumi.<stack>.yaml` config file, independent of whichever backend stores the actual
resource state.

## Alternatives Considered

- **A local `file://` backend**: rejected as the sole backend — no locking, no off-machine
  backup; state loss on disk failure means losing track of every provisioned resource.
- **A self-managed remote backend** (S3, Backblaze, Azure Blob): rejected — Pulumi Cloud's free
  tier already provides locking and durability for an individual homelab with zero
  infrastructure to run/pay for.
- **Pulumi Cloud's own service-managed secrets encryption** (the default when logging into
  Pulumi Cloud): rejected — would hand Pulumi's own service control of the encryption key for
  secret config values (like the 1Password Service Account token in `Pulumi.homelab.yaml`),
  versus keeping that key entirely under local passphrase control.

## Consequences

- State gets locking and off-machine durability without any infrastructure to run.
- The stack's `PULUMI_CONFIG_PASSPHRASE` remains the single point of failure for decrypting
  secure config values — losing it means those values (though not the resources themselves)
  become unrecoverable and must be re-entered.
- Migrating backends this way (`stack init --secrets-provider passphrase` against a new backend,
  reusing the existing `Pulumi.<stack>.yaml`) is what keeps the encryption key stable across the
  migration — confirmed empirically in a sandbox before doing it against the real stack.
- Future improvement: consider a password manager-backed secrets provider (e.g.
  `passphrase` via a script that reads 1Password) if remembering/storing the raw passphrase
  becomes a friction point.
