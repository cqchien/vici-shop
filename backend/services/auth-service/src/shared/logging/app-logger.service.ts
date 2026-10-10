import { Inject, Injectable, Optional, Scope } from '@nestjs/common';
import { INQUIRER } from '@nestjs/core';
import { PinoLogger } from 'nestjs-pino';

import { LoggerPort } from './logger.port';

type Fields = Record<string, unknown>;

/**
 * The logger every class injects. Transient + `INQUIRER` → the `context` field is the injecting
 * class's name automatically, so no one writes `new Logger('Foo')` or passes a name.
 *
 *   constructor(private readonly log: AppLogger) {}
 *   this.log.info('account registered', { accountId });
 */
@Injectable({ scope: Scope.TRANSIENT })
export class AppLogger implements LoggerPort {
  private readonly context: string;

  constructor(
    private readonly pino: PinoLogger,
    @Optional() @Inject(INQUIRER) inquirer?: object | string,
  ) {
    this.context =
      typeof inquirer === 'string' ? inquirer : (inquirer?.constructor?.name ?? 'App');
  }

  info(message: string, fields: Fields = {}): void {
    this.pino.info({ context: this.context, ...fields }, message);
  }

  warn(message: string, fields: Fields = {}): void {
    this.pino.warn({ context: this.context, ...fields }, message);
  }

  debug(message: string, fields: Fields = {}): void {
    this.pino.debug({ context: this.context, ...fields }, message);
  }

  error(message: string, error?: unknown, fields: Fields = {}): void {
    this.pino.error({ context: this.context, err: normalizeError(error), ...fields }, message);
  }
}

function normalizeError(error: unknown): unknown {
  if (error === undefined) {
    return undefined;
  }
  return error instanceof Error ? error : { message: String(error) };
}
