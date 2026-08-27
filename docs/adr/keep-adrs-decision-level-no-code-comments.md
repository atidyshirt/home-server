# Keep ADRs decision-level; no comments in code or YAML

## Status

Accepted

## Context

Both ADRs and inline comments exist to preserve rationale, and both are tempting to over-fill:
an ADR can creep from "the decision and why" into a running log of every policy nuance and
config knob as edge cases get discovered, and a manifest can pick up comments explaining what a
value does as those same edge cases get debugged. Either way, the explanation duplicates what
the code, the manifest, or `AGENT.md`'s pattern docs already show, and rots the moment one side
changes without the other.

## Decision

- ADRs stay a 3000-foot view: the decision, the *why*, and alternatives considered — not a
  walkthrough of every current policy nuance or config knob. Implementation detail lives in the
  code/manifests themselves, or in `AGENT.md`'s pattern docs if it's a reusable convention worth
  a name.
- No comments in code or YAML, ever. Names and structure carry the meaning. Non-trivial context
  that isn't self-evident from the code goes in the Linear issue for that change, or in
  `AGENT.md` if it's a reusable pattern future work will hit again.

## Alternatives Considered

- **Let ADRs grow to cover every implementation nuance as it's discovered**: rejected — an ADR
  documenting "why Traefik over Envoy" doesn't need to also track every subsequent config tweak;
  that belongs in the manifest or `AGENT.md`, and an ADR that tries to stay current with
  implementation detail rots the moment the implementation changes.
- **Explanatory comments in YAML for non-obvious values** (e.g. `# required, no default`):
  rejected — comments drift from the manifest they describe with nothing to catch it; a naming
  change or a pattern documented once in `AGENT.md` carries the same intent without a second
  copy to keep in sync.

## Consequences

- Docs stay small enough to actually read, and an ADR can be trusted as "the decision," not "the
  decision as of some earlier point before it drifted from the implementation."
- Anyone changing a manifest can't lean on an existing comment to explain intent — the commit
  message, the Linear issue, or `AGENT.md` are the only places that context can live.
- New comments in code/YAML, or new implementation detail creeping into an ADR, are review
  findings, not style nitpicks.
