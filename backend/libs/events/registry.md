# Event Registry

**Placeholder — backend is scaffold-only.**

The full Kafka topic catalog (topic name, owning service, Avro schema, consumers, consumer
groups, and the mandatory `tenant-id` header / `tenantId` envelope rule) is specified across:

- the **Events** section of each service spec in [`docs/40-services/`](../../../docs/40-services/)
- [`docs/20-architecture/04-service-contracts-conventions.md`](../../../docs/20-architecture/04-service-contracts-conventions.md) §3 (Kafka conventions, envelope, outbox)
- [`docs/20-architecture/adrs/ADR-004-kafka-outbox-events.md`](../../../docs/20-architecture/adrs/ADR-004-kafka-outbox-events.md)
- [`docs/knowledge/07-event-driven-kafka/`](../../../docs/knowledge/07-event-driven-kafka/) and [`06-outbox/`](../../../docs/knowledge/06-outbox/)

Populate this file (and `schemas/*.avsc`) when backend implementation begins.
