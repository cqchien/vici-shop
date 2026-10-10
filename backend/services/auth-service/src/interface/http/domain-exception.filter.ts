import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Inject } from '@nestjs/common';
import type { Response } from 'express';

import { DomainError, errorBody, ErrorEnvelope, LOGGER, LoggerPort } from '../../shared';

const STATUS_CODES: Readonly<Record<number, string>> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'RATE_LIMITED',
};

/**
 * The single edge mapping from thrown errors to the REST error envelope
 *
 *  - `DomainError`   → its own `code` + `httpStatus` + `field`
 *  - `HttpException` → framework errors, incl. `ValidationPipe` (→ `VALIDATION_ERROR`, 400)
 *  - anything else   → `INTERNAL`, 500, detail logged but never leaked in `message`
 *
 * Request/response lines (incl. 4xx) are logged once by pino-http; this filter adds the 5xx
 * error itself — the one thing pino-http can't see, since the exception was handled here.
 */
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  constructor(@Inject(LOGGER) private readonly logger: LoggerPort) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const { status, body } = this.render(exception);

    if (status >= 500) {
      this.logger.error('unhandled exception', exception, { code: body.error.code });
    }

    res.status(status).json(body);
  }

  private render(exception: unknown): { status: number; body: ErrorEnvelope } {
    if (exception instanceof DomainError) {
      return {
        status: exception.httpStatus,
        body: errorBody(exception.code, exception.message, exception.field ?? null),
      };
    }
    if (exception instanceof HttpException) {
      return this.renderHttpException(exception);
    }
    return { status: 500, body: errorBody('INTERNAL', 'Internal server error') };
  }

  private renderHttpException(exception: HttpException): { status: number; body: ErrorEnvelope } {
    const status = exception.getStatus();
    const response = exception.getResponse();

    if (typeof response === 'object' && response !== null && 'message' in response) {
      const raw = (response as { message: unknown }).message;
      const messages = Array.isArray(raw) ? raw.map(String) : [String(raw)];
      const code = status === 400 ? 'VALIDATION_ERROR' : this.statusToCode(status);
      return { status, body: errorBody(code, messages.join('; ')) };
    }
    return { status, body: errorBody(this.statusToCode(status), exception.message) };
  }

  private statusToCode(status: number): string {
    return STATUS_CODES[status] ?? (status >= 500 ? 'INTERNAL' : 'ERROR');
  }
}
