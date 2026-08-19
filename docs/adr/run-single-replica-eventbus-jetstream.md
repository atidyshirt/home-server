# Run EventBus JetStream single-replica for single-node topology

## Status

Accepted

## Context

Argo Events' `EventBus` needs a JetStream (NATS) deployment to carry events from the webhook
`EventSource` to the `Sensor`. JetStream supports clustered, multi-replica deployments for HA,
but this homelab runs a single-node k0s cluster — there's only one node for any pod to schedule
onto.

## Decision

Set both the JetStream *server* replica count (`spec.jetstream.replicas`) and the *stream*
replica count (`spec.jetstream.streamConfig`, a YAML string field — not a nested mapping,
confirmed the hard way) to `1`, matching the single-node topology.

## Alternatives Considered

- **Leave the stream replica count at its controller default (3)**: rejected — not a real
  choice so much as a bug that had to be fixed. NATS rejects creating a stream with more
  replicas than there are clustered JetStream server nodes; with `jetstream.replicas: 1` (a
  single, non-clustered server), any stream replica count above 1 makes every `EventSource`
  and `Sensor` pod crash-loop on `nats: replicas > 1 not supported in non-clustered mode`.
- **Run JetStream with 3 server replicas for HA**: rejected — the cluster has exactly one node;
  a 3-replica JetStream StatefulSet would still all schedule onto the same node, providing no
  actual HA benefit while using more resources on already-constrained hardware.

## Consequences

- No HA for the event bus — if the single JetStream pod goes down, the whole build-and-deploy
  trigger pipeline is down until it recovers. Acceptable for a homelab with one node; would not
  be for a production multi-node deployment.
- `streamConfig` being a raw YAML string (not a structured object) isn't validated by the
  `EventBus` CRD's loose schema — a wrong type is silently accepted by the API server but
  never actually applied by the controller, which is worse than a rejected write, since nothing
  signals the mistake. Confirmed by directly reading the controller's Go source/docs, not by
  guessing from the CRD alone.
- Future improvement: if this cluster ever grows to multiple nodes, revisit both replica counts
  together — they need to move in lockstep with each other and with the underlying node count.
