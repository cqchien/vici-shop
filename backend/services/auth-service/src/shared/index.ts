/**
 * The framework-free face of `src/shared/`. `domain/` and `application/` import from here, so
 * everything re-exported below must stay pure — no `@nestjs/*`, no pino, no env reads.
 *
 * Note the deep import for `LOGGER`: it points at `./logging/logger.port` (the token + interface,
 * pure) and deliberately NOT at `./logging` (the barrel, which pulls `AppLogger` → `@nestjs/*` →
 * `nestjs-pino`). Tidying that into `'./logging'` would drag the whole NestJS logging stack into
 * the domain's import graph. Same reason `config/` is absent entirely: it reads `process.env`,
 * so it is imported by path from the composition root, never re-exported here.
 */
export { DomainError } from './errors/domain-error';
export { DirectAccessForbiddenError } from './errors/direct-access-forbidden.error';
export { MissingTenantContextError } from './errors/missing-tenant-context.error';
export {
  success,
  errorBody,
  type SuccessEnvelope,
  type ErrorEnvelope,
} from './http/response-envelope';
export { CLS_REQUEST_ID, CLS_TENANT_ID } from './tenant/cls-keys';
export { LOGGER, type LoggerPort } from './logging/logger.port';
export { uuidV7 } from './utils/uuid';
