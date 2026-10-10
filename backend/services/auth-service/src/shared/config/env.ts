import { z } from 'zod';

/**
 * Environment schema — the single validation point.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  LOG_LEVEL: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
  ),

  DATABASE_URL: z.string().min(1),

  // Direct-access lockdown. Kong stamps this on every proxied request; GatewayOnlyGuard
  // rejects anything else. No default — a missing secret must stop the service from starting
  // (fail-closed), never silently disable the check.
  GATEWAY_SHARED_SECRET: z.string().min(1),

  // OTP — verify_email code lifetime.
  OTP_TTL_MINUTES: z.coerce.number().int().positive().default(15),

  // Password hashing (argon2id). OWASP-ish defaults; tune per environment.
  ARGON2_MEMORY_COST: z.coerce.number().int().positive().default(19_456),
  ARGON2_TIME_COST: z.coerce.number().int().positive().default(2),
  ARGON2_PARALLELISM: z.coerce.number().int().positive().default(1),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
