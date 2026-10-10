import { WeakPasswordError } from '../../error/auth-errors';
import { isValidPassword } from '../utils/password.validation';
import { ValueObject } from './value-object.base';

const REDACTED = '[RawPassword]';

/** A plaintext password that meets the policy. Lives only long enough to be hashed. */
export class RawPassword extends ValueObject<string> {
  static of(raw: string): RawPassword {
    const isValid = isValidPassword(raw);
    if (!isValid) {
      throw new WeakPasswordError('Password does not meet policy requirements');
    }
    return new RawPassword(raw);
  }

  /** Guard against the password leaking into logs / stack traces / JSON. */
  override toString(): string {
    return REDACTED;
  }

  override toJSON(): string {
    return REDACTED;
  }
}
