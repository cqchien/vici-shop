import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClsModule } from 'nestjs-cls';
import type { Request } from 'express';

import { RegisterAccountUseCase } from './application/use-case';
import { APP_CONFIG } from './application/config/auth-config';
import {
  ACCOUNT_REPOSITORY,
  CLOCK,
  HASHER,
  OTP_GENERATOR,
  TENANT_CONTEXT,
} from './domain/port';
import { ApiConfigService } from './shared/config/api-config.service';
import { ConfigModule } from './shared/config/config.module';
import { Argon2Hasher } from './infrastructure/hashing/argon2-hasher';
import { LoggingModule } from './shared/logging';
import { AccountEntity } from './infrastructure/persistence/entity/account.entity';
import { OtpCodeEntity } from './infrastructure/persistence/entity/otp-code.entity';
import { buildDataSourceOptions } from './infrastructure/persistence/data-source';
import { TenantTransactionRunner } from './infrastructure/persistence/tenant-transaction';
import { CryptoOtpGenerator } from './infrastructure/system/crypto-otp-generator';
import { SystemClock } from './infrastructure/system/system-clock';
import { ClsTenantContext } from './infrastructure/tenant/cls-tenant-context';
import { DomainExceptionFilter } from './interface/http/domain-exception.filter';
import { GatewayOnlyGuard } from './interface/http/gateway.guard';
import { ResponseTransformInterceptor } from './interface/http/response-transform.interceptor';
import { AuthController } from './interface/rest/auth.controller';
import { HealthController } from './interface/rest/health.controller';
import { CLS_REQUEST_ID, CLS_TENANT_ID } from './shared/tenant/cls-keys';
import { uuidV7 } from './shared/utils/uuid';
import { TypeormAccountRepository } from './infrastructure/persistence/repository/typeorm-account.repository';

@Module({
  imports: [
    ConfigModule,
    LoggingModule,
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        setup: (cls, req: Request): void => {
          const tenantId = req.headers['x-tenant-id'];
          if (typeof tenantId === 'string' && tenantId.length > 0) {
            cls.set(CLS_TENANT_ID, tenantId);
          }
          const reqId = (req as Request & { id?: unknown }).id;
          const headerId = req.headers['x-request-id'];
          cls.set(
            CLS_REQUEST_ID,
            typeof reqId === 'string' && reqId.length > 0
              ? reqId
              : typeof headerId === 'string' && headerId.length > 0
                ? headerId
                : uuidV7(),
          );
        },
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ApiConfigService],
      useFactory: (config: ApiConfigService) => ({
        ...buildDataSourceOptions(config.databaseUrl, config.typeormLogging),
        retryAttempts: 3,
        retryDelay: 1000,
      }),
    }),
    TypeOrmModule.forFeature([AccountEntity, OtpCodeEntity]),
  ],
  controllers: [AuthController, HealthController],
  providers: [
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseTransformInterceptor },
    { provide: APP_GUARD, useClass: GatewayOnlyGuard },

    // ── ports → adapters ────────────────────────────────────────────────────
    { provide: CLOCK, useClass: SystemClock },
    { provide: OTP_GENERATOR, useClass: CryptoOtpGenerator },
    { provide: TENANT_CONTEXT, useClass: ClsTenantContext },
    { provide: HASHER, useClass: Argon2Hasher },
    { provide: ACCOUNT_REPOSITORY, useClass: TypeormAccountRepository },
    {
      provide: APP_CONFIG,
      inject: [ApiConfigService],
      useFactory: (config: ApiConfigService) => ({ otpTtlMinutes: config.otpTtlMinutes }),
    },

    TenantTransactionRunner,
    RegisterAccountUseCase,
  ],
})
export class AuthModule {}
