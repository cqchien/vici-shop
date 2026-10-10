import { v7 } from 'uuid';

/**
 * The only UUID factory in this service (ADR-013). **v7**, never v4.
 *
 * RFC 9562 puts a 48-bit Unix millisecond timestamp in the leading bits, so generated ids sort by
 * creation time: inserts land at the right edge of a B-tree instead of scattering across it the
 * way v4 does. That matters for every `tenant_id`-prefixed index in the pooled multi-tenant
 * schema (ADR-007), and it lets an id in a log line reveal roughly when it was minted.
 *
 * `node:crypto` cannot do this — `randomUUID()` is v4 only, and `randomUUID({ version: 7 })`
 * silently returns a v4 rather than failing. Postgres gained `uuidv7()` in 18; we run 16
 * (ADR-003), and an aggregate needs its identity before the row exists anyway.
 */
export function uuidV7(): string {
  return v7();
}
