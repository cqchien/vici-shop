import type { IncomingMessage, ServerResponse } from 'node:http';

import type { Params } from 'nestjs-pino';
import { stdTimeFunctions } from 'pino';

import { ApiConfigService } from '../config';
import { uuidV7 } from '../utils/uuid';

/**
 * One pino configuration for the whole service:
 *  - JSON to stdout always; `pino-pretty` (colour, single line) only in development
 *  - level names not numbers (`"level":"info"`), ISO timestamps, `message` as the text key
 *  - secrets/credentials redacted before anything is written
 *  - one line per HTTP request (method, url, status, duration); `/health*` is silent
 *  - `reqId` = the inbound `X-Request-Id` (Kong's correlation id) or a fresh UUID v7
 */
export function buildPinoParams(config: ApiConfigService): Params {
  const isDev = config.isDevelopment;
  const isTest = config.nodeEnv === 'test';

  return {
    pinoHttp: {
      level: isTest ? 'silent' : config.logLevel,
      timestamp: stdTimeFunctions.isoTime,
      messageKey: 'message',
      base: { service: 'auth-service', env: config.nodeEnv },
      formatters: {
        level: (label) => ({ level: label }),
      },
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-gateway-secret"]',
          'res.headers["set-cookie"]',
          '*.password',
          '*.passwordHash',
          '*.password_hash',
          '*.plaintext',
          '*.otp',
          '*.codeHash',
          '*.code_hash',
          '*.token',
          '*.accessToken',
          '*.refreshToken',
          '*.secret',
          '*.gatewaySharedSecret',
        ],
        censor: '[redacted]',
      },
      // Keep request/response logs small — id + the essentials, not every header.
      serializers: {
        req: (req: { id: unknown; method: string; url: string }) => ({
          id: req.id,
          method: req.method,
          url: req.url,
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
      genReqId: (req: IncomingMessage) => {
        const header = req.headers['x-request-id'];
        return (Array.isArray(header) ? header[0] : header) || uuidV7();
      },
      autoLogging: {
        ignore: (req: IncomingMessage) => (req.url ?? '').startsWith('/health'),
      },
      quietReqLogger: true,
      customLogLevel: (_req: IncomingMessage, res: ServerResponse, err?: Error) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      customSuccessMessage: (req: IncomingMessage, res: ServerResponse) =>
        `${req.method} ${req.url} ${res.statusCode}`,
      customErrorMessage: (req: IncomingMessage, res: ServerResponse) =>
        `${req.method} ${req.url} ${res.statusCode}`,
      ...(isDev
        ? {
            transport: {
              target: 'pino-pretty',
              options: {
                singleLine: true,
                colorize: true,
                translateTime: 'SYS:HH:MM:ss.l',
                ignore: 'pid,hostname,req,res,service,env',
                messageKey: 'message',
              },
            },
          }
        : {}),
    },
  };
}
