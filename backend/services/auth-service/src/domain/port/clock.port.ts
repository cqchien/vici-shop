export const CLOCK = 'CLOCK';

/**
 * The wall clock is I/O, so it stays a port: a use case never calls `new Date()` itself. Tests
 * inject a clock pinned to a fixed instant, which is what makes time-dependent rules (OTP
 * expiry, drop windows, voucher validity) deterministic to assert.
 *
 * A `Date` is an instant — a count of milliseconds since the epoch, with no zone of its own
 * (ADR-013). A timezone only ever interprets or renders one.
 */
export interface Clock {
  now(): Date;
}
