import { MalformedIdentifierError } from '../../error/auth-errors';
import { uuidV7 } from '../../../shared/utils/uuid';
import { normaliseUuid } from '../utils/normalise';
import { isUuid } from '../utils/uuid.validation';
import { ValueObject } from './value-object.base';

/** Identity of an `Account` aggregate. Generated at registration; never reused across tenants. */
export class AccountId extends ValueObject<string> {
  static generate(): AccountId {
    return new AccountId(uuidV7());
  }

  /** Rehydration from a stored value — a non-UUID here means a corrupted row, not bad input (500). */
  static of(value: string): AccountId {
    const normalised = normaliseUuid(value);
    if (!isUuid(normalised)) {
      throw new MalformedIdentifierError(`${value} is not a valid AccountId`);
    }
    return new AccountId(normalised);
  }
}
