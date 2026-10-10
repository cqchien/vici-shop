/**
 * RFC 9562 layout: version nibble 1–8 (first digit of the third group) and the RFC variant
 * `10xx` (first digit of the fourth group is 8, 9, a or b). The nil and max UUIDs fail both
 * checks, which is intended — neither is a valid entity identity.
 *
 * Deliberately wider than what we mint: ADR-013 makes **v7** the only version this service
 * *generates*, but `tenant_id` arrives as request input (`X-Tenant-Id`, ADR-009) and may be any
 * valid UUID. We accept 1–8 and validate only the shape.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Expects a value already passed through `normaliseUuid`. */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
