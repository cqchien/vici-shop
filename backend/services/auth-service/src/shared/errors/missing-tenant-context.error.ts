import { DomainError } from './domain-error';

/**
 * Raised when a request reaches a tenant-plane operation without a resolved tenant.
 */
export class MissingTenantContextError extends DomainError {
  readonly code = 'MISSING_TENANT_CONTEXT';
  readonly httpStatus = 400;

  constructor(message: string) {
    super(message);
  }
}
