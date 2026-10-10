import { AccountEntity } from '../entity/account.entity';
import { OtpCodeEntity } from '../entity/otp-code.entity';
import { Account, AccountId, Email, OtpCode, PasswordHash, TenantId } from '../../../domain/model';

/**
 * Boundary mappers: domain model <-> ORM rows. The domain model is never an ORM entity.
 *
 * Instants need no conversion here (ADR-013): a `timestamptz` column is a `Date` on both sides,
 * and Postgres hands it back as the same instant it stored. Identity and the Value Objects are
 * what this boundary translates.
 */
export const AccountMapper = {
  toEntity(account: Account): AccountEntity {
    const row = new AccountEntity();
    row.id = account.id.value;
    row.tenantId = account.tenantId.value;
    row.email = account.email.value;
    row.passwordHash = account.passwordHash.value;
    row.role = account.role;
    row.locked = account.locked;
    row.emailVerifiedAt = account.emailVerifiedAt;
    return row;
  },

  toDomain(row: AccountEntity): Account {
    return Account.rehydrate({
      id: AccountId.of(row.id),
      tenantId: TenantId.of(row.tenantId),
      email: Email.of(row.email),
      passwordHash: PasswordHash.of(row.passwordHash),
      role: row.role,
      locked: row.locked,
      emailVerifiedAt: row.emailVerifiedAt,
      createdAt: row.createdAt,
    });
  },
};

export const OtpCodeMapper = {
  toEntity(otp: OtpCode, tenantId: string): OtpCodeEntity {
    const row = new OtpCodeEntity();
    row.id = otp.id;
    row.tenantId = tenantId;
    row.accountId = otp.accountId.value;
    row.codeHash = otp.codeHash;
    row.purpose = otp.purpose;
    row.expiresAt = otp.expiresAt;
    row.consumedAt = otp.consumedAt;
    return row;
  },
};
