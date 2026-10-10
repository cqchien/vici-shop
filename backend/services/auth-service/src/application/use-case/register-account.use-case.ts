import { Inject, Injectable } from '@nestjs/common';

import { APP_CONFIG, AppConfig } from '../config/auth-config';
import { RegisterAccountInput, RegisterAccountResult } from '../dto/register-account.io';
import { Account, Email, PasswordHash, RawPassword, TenantId } from '../../domain/model';
import { EmailAlreadyRegisteredError } from '../../domain/error';
import { LOGGER, LoggerPort } from '../../shared';
import {
  ACCOUNT_REPOSITORY,
  AccountRepository,
  CLOCK,
  Clock,
  HASHER,
  Hasher,
  OTP_GENERATOR,
  OtpGenerator,
  TENANT_CONTEXT,
  TenantContextPort,
} from '../../domain/port';
import { OtpMaterial } from '../../domain/model';

@Injectable()
export class RegisterAccountUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly accounts: AccountRepository,
    @Inject(HASHER) private readonly hasher: Hasher,
    @Inject(OTP_GENERATOR) private readonly otpGenerator: OtpGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(TENANT_CONTEXT) private readonly tenantContext: TenantContextPort,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(LOGGER) private readonly logger: LoggerPort,
  ) {}

  async execute(input: RegisterAccountInput): Promise<RegisterAccountResult> {
    const tenantId = TenantId.of(this.tenantContext.currentTenantId());
    const email = Email.of(input.email);
    const password = RawPassword.of(input.password);

    if (await this.accounts.existsByEmail(email)) {
      throw new EmailAlreadyRegisteredError(`${email.value} is already registered`);
    }

    const now = this.clock.now();
    const hashedPassword = await this.hasher.hash(password.value);

    const optConfig = await this.generateOtp();

    const account = Account.register({
      tenantId,
      email,
      passwordHash: PasswordHash.of(hashedPassword),
      otp: optConfig,
      now,
    });

    await this.accounts.save(account);

    this.logger.info('Account registered', {
      event: 'auth.account_registered',
      accountId: account.id.value,
      tenantId: tenantId.value,
    });

    return { accountId: account.id.value, emailVerificationRequired: true };
  }

  private async generateOtp(): Promise<OtpMaterial> {
    const otpPlaintext = this.otpGenerator.sixDigits();
    const otpCodeHash = await this.hasher.hash(otpPlaintext);
    return { codeHash: otpCodeHash, ttlMinutes: this.config.otpTtlMinutes };
  }
}
