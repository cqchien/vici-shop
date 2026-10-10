import { Inject, Injectable, Optional } from '@nestjs/common';
import type { LoggerOptions } from 'typeorm';

import { Env, loadEnv } from './env';

/** Token that is never registered — lets tests pass an env source while DI injects `undefined`. */
const ENV_SOURCE = 'CONFIG_ENV_SOURCE';

export interface Argon2Config {
  memoryCost: number;
  timeCost: number;
  parallelism: number;
}

/**
 * Typed, injectable view over the validated environment (boilerplate `ApiConfigService` pattern).
 * Nothing else in the app reads `process.env` or calls `loadEnv()` — they depend on this.
 */
@Injectable()
export class ApiConfigService {
  private readonly env: Env;

  /** `source` is only passed in tests; under DI it is `undefined` → `loadEnv` reads `process.env`. */
  constructor(@Optional() @Inject(ENV_SOURCE) source?: NodeJS.ProcessEnv) {
    this.env = loadEnv(source);
  }

  get nodeEnv(): Env['NODE_ENV'] {
    return this.env.NODE_ENV;
  }

  get isDevelopment(): boolean {
    return this.env.NODE_ENV === 'development';
  }

  /** pino level — `LOG_LEVEL` env, else `debug` in dev / `info` elsewhere. */
  get logLevel(): NonNullable<Env['LOG_LEVEL']> {
    return this.env.LOG_LEVEL ?? (this.isDevelopment ? 'debug' : 'info');
  }

  get appPort(): number {
    return this.env.PORT;
  }

  get databaseUrl(): string {
    return this.env.DATABASE_URL;
  }

  /** ADR-012 — checked by `GatewayOnlyGuard` against `X-Gateway-Secret`. */
  get gatewaySharedSecret(): string {
    return this.env.GATEWAY_SHARED_SECRET;
  }

  get typeormLogging(): LoggerOptions {
    return this.isDevelopment ? ['error', 'warn'] : ['error'];
  }

  get otpTtlMinutes(): number {
    return this.env.OTP_TTL_MINUTES;
  }

  get argon2(): Argon2Config {
    return {
      memoryCost: this.env.ARGON2_MEMORY_COST,
      timeCost: this.env.ARGON2_TIME_COST,
      parallelism: this.env.ARGON2_PARALLELISM,
    };
  }
}
