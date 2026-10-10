import { Injectable } from '@nestjs/common';

import { AccountMapper, OtpCodeMapper } from '../mapper/account.mapper';
import { AccountEntity } from '../entity/account.entity';
import { OtpCodeEntity } from '../entity/otp-code.entity';
import { TenantTransactionRunner } from '../tenant-transaction';
import { Account, Email } from '../../../domain/model';
import { AccountRepository } from '../../../domain/port';

@Injectable()
export class TypeormAccountRepository implements AccountRepository {
  constructor(private readonly tx: TenantTransactionRunner) {}

  async existsByEmail(email: Email): Promise<boolean> {
    return this.tx.run(async (manager) => {
      const count = await manager.getRepository(AccountEntity).count({
        where: { email: email.value },
      });
      return count > 0;
    });
  }

  async save(account: Account): Promise<void> {
    const tenantId = account.tenantId.value;

    const accountRow = AccountMapper.toEntity(account);
    const otpRows = account.pendingOtps.map((otp) => OtpCodeMapper.toEntity(otp, tenantId));

    await this.tx.run(async (manager) => {
      await manager.getRepository(AccountEntity).insert(accountRow);
      if (otpRows.length > 0) {
        await manager.getRepository(OtpCodeEntity).insert(otpRows);
      }
    });
  }
}
