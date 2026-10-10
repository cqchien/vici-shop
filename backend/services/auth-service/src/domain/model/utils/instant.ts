/**
 * `Date` is the instant type of `domain/` and `application/` (ADR-013) — one type end to end, so
 * nothing has to be converted at a boundary. The price is that a `Date` is **mutable**: a caller
 * holding `account.createdAt` could `setFullYear()` on the aggregate's own field. So an aggregate
 * stores and hands out copies, never the reference it was given.
 *
 * `new Date(d)` clones the instant exactly (ES2015 reads the `[[DateValue]]` slot directly), which
 * is why this needs no millisecond arithmetic.
 */
export function copyInstant(value: Date): Date;
export function copyInstant(value: Date | null): Date | null;
export function copyInstant(value: Date | null): Date | null {
  return value === null ? null : new Date(value);
}
