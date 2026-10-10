import { addMinutes, isBefore } from 'date-fns';

import { uuidV7 } from '../../shared/utils/uuid';
import { copyInstant } from './utils/instant';
import { AccountId } from './value-object';

export type OtpPurpose = 'verify_email' | 'reset_password';

export class OtpCode {
  private constructor(
    private readonly _id: string,
    private readonly _accountId: AccountId,
    private readonly _purpose: OtpPurpose,
    private readonly _codeHash: string,
    private readonly _expiresAt: Date,
    private _consumedAt: Date | null,
  ) {}

  get id(): string {
    return this._id;
  }
  get accountId(): AccountId {
    return this._accountId;
  }
  get purpose(): OtpPurpose {
    return this._purpose;
  }
  get codeHash(): string {
    return this._codeHash;
  }
  get expiresAt(): Date {
    return copyInstant(this._expiresAt);
  }
  get consumedAt(): Date | null {
    return copyInstant(this._consumedAt);
  }

  static issue(params: {
    accountId: AccountId;
    purpose: OtpPurpose;
    codeHash: string;
    now: Date;
    ttlMinutes: number;
  }): OtpCode {
    return new OtpCode(
      uuidV7(),
      params.accountId,
      params.purpose,
      params.codeHash,
      addMinutes(params.now, params.ttlMinutes),
      null,
    );
  }

  /**
   * Expiry is inclusive: at the very millisecond it expires, the code is already dead — so
   * "not expired" is strictly *before* `expiresAt`, and anything else is expired.
   */
  isExpired(now: Date): boolean {
    return !isBefore(now, this._expiresAt);
  }

  isConsumed(): boolean {
    return this._consumedAt !== null;
  }

  markConsumed(now: Date): void {
    this._consumedAt = copyInstant(now);
  }
}
