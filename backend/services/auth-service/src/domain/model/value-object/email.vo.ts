import { InvalidEmailError } from '../../error/auth-errors';
import { normaliseEmail } from '../utils/normalise';
import { isValidEmail } from '../utils/email.validation';
import { ValueObject } from './value-object.base';

export class Email extends ValueObject<string> {
  static of(raw: string): Email {
    const normalised = normaliseEmail(raw);
    if (!isValidEmail(normalised)) {
      throw new InvalidEmailError(`${raw} is not a valid email address`);
    }
    return new Email(normalised);
  }
}
