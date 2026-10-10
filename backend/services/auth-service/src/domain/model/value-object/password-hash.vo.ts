import { InvalidPasswordHashError } from '../../error/auth-errors';
import { ValueObject } from './value-object.base';

const REDACTED = '[PasswordHash]';

export class PasswordHash extends ValueObject<string> {
  static of(value: string): PasswordHash {
    if (!value || value.trim().length === 0) {
      throw new InvalidPasswordHashError('Password hash must not be empty');
    }
    return new PasswordHash(value);
  }

  /** A hash is not a secret like the password, but it must never reach a log or a response. */
  override toString(): string {
    return REDACTED;
  }

  override toJSON(): string {
    return REDACTED;
  }
}
