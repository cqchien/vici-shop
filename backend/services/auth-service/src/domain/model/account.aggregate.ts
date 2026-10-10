import { OtpCode, OtpPurpose } from './otp-code.entity';
import { copyInstant } from './utils/instant';
import { AccountId, Email, PasswordHash, TenantId } from './value-object';

export type AccountRole = 'customer' | 'staff' | 'admin' | 'tenant_admin' | 'platform_admin';

export interface OtpMaterial {
  codeHash: string;
  ttlMinutes: number;
}

export class Account {
  private readonly _pendingOtps: OtpCode[] = [];

  private constructor(
    private readonly _id: AccountId,
    private readonly _tenantId: TenantId,
    private readonly _email: Email,
    private _passwordHash: PasswordHash,
    private _role: AccountRole,
    private _locked: boolean,
    private _emailVerifiedAt: Date | null,
    private readonly _createdAt: Date,
  ) {}

  /** OTP entities created during this unit of work, for the repository to persist. */
  get pendingOtps(): readonly OtpCode[] {
    return this._pendingOtps;
  }

  get id(): AccountId {
    return this._id;
  }
  get tenantId(): TenantId {
    return this._tenantId;
  }
  get email(): Email {
    return this._email;
  }
  get passwordHash(): PasswordHash {
    return this._passwordHash;
  }
  get role(): AccountRole {
    return this._role;
  }
  get locked(): boolean {
    return this._locked;
  }
  get emailVerifiedAt(): Date | null {
    return copyInstant(this._emailVerifiedAt);
  }
  get createdAt(): Date {
    return copyInstant(this._createdAt);
  }

  isEmailVerified(): boolean {
    return this._emailVerifiedAt !== null;
  }

  /** Rehydration from persistence — invariants were enforced when the row was first written. */
  static rehydrate(props: {
    id: AccountId;
    tenantId: TenantId;
    email: Email;
    passwordHash: PasswordHash;
    role: AccountRole;
    locked: boolean;
    emailVerifiedAt: Date | null;
    createdAt: Date;
  }): Account {
    return new Account(
      props.id,
      props.tenantId,
      props.email,
      props.passwordHash,
      props.role,
      props.locked,
      copyInstant(props.emailVerifiedAt),
      copyInstant(props.createdAt),
    );
  }

  static register(params: {
    tenantId: TenantId;
    email: Email;
    passwordHash: PasswordHash;
    otp: OtpMaterial;
    now: Date;
  }): Account {
    const account = new Account(
      AccountId.generate(),
      params.tenantId,
      params.email,
      params.passwordHash,
      'customer',
      false,
      null,
      copyInstant(params.now),
    );
    account.requestEmailVerification(params.otp, params.now);
    return account;
  }

  private requestEmailVerification(otp: OtpMaterial, now: Date): void {
    const purpose: OtpPurpose = 'verify_email';
    const code = OtpCode.issue({
      accountId: this._id,
      purpose,
      codeHash: otp.codeHash,
      now,
      ttlMinutes: otp.ttlMinutes,
    });
    this._pendingOtps.push(code);
  }
}
