export const TENANT_CONTEXT = 'TENANT_CONTEXT';

export interface TenantContextPort {
  /** Current tenant id (UUID string). Throws `MissingTenantContextError` when unresolved. */
  currentTenantId(): string;
  /** Correlation id for logs and the response envelope. */
  currentRequestId(): string;
}
