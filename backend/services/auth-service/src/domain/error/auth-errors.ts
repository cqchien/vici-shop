import { DomainError } from '../../shared/errors/domain-error';

export class InvalidEmailError extends DomainError {
  readonly code = 'INVALID_EMAIL';
  readonly httpStatus = 400;

  constructor(message: string) {
    super(message, 'email');
  }
}

export class WeakPasswordError extends DomainError {
  readonly code = 'WEAK_PASSWORD';
  readonly httpStatus = 400;

  constructor(reason: string) {
    super(reason, 'password');
  }
}

export class InvalidTenantIdError extends DomainError {
  readonly code = 'INVALID_TENANT_ID';
  readonly httpStatus = 400;

  constructor(message: string) {
    super(message, 'tenantId');
  }
}

export class EmailAlreadyRegisteredError extends DomainError {
  readonly code = 'EMAIL_ALREADY_REGISTERED';
  readonly httpStatus = 409;

  constructor(message: string) {
    super(message, 'email');
  }
}

export class MalformedIdentifierError extends DomainError {
  readonly code = 'MALFORMED_IDENTIFIER';
  readonly httpStatus = 500;

  constructor(message: string) {
    super(message, 'id');
  }
}

export class InvalidPasswordHashError extends DomainError {
  readonly code = 'INVALID_PASSWORD_HASH';
  readonly httpStatus = 500;

  constructor(message: string) {
    super(message, 'password');
  }
}
