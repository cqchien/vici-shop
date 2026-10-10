import { InvalidTenantIdError } from '../../error/auth-errors';
import { normaliseUuid } from '../utils/normalise';
import { isUuid } from '../utils/uuid.validation';
import { ValueObject } from './value-object.base';

/** The tenant a request acts for. Arrives as request input (`X-Tenant-Id`), so a bad value is a 400. */
export class TenantId extends ValueObject<string> {
  static of(value: string): TenantId {
    const normalised = normaliseUuid(value);
    if (!isUuid(normalised)) {
      throw new InvalidTenantIdError(`${value} is not a valid TenantId`);
    }
    return new TenantId(normalised);
  }
}
