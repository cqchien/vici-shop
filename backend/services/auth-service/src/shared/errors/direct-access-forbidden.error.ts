import { DomainError } from './domain-error';

export class DirectAccessForbiddenError extends DomainError {
  readonly code = 'DIRECT_ACCESS_FORBIDDEN';
  readonly httpStatus = 403;

  constructor(message: string) {
    super(message);
  }
}
