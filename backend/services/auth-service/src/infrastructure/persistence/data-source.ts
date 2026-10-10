import { join } from 'node:path';

import { DataSourceOptions, LoggerOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

import { AccountEntity } from './entity/account.entity';
import { OtpCodeEntity } from './entity/otp-code.entity';

export function buildDataSourceOptions(
  databaseUrl: string,
  logging: LoggerOptions = ['error'],
): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    namingStrategy: new SnakeNamingStrategy(),
    entities: [AccountEntity, OtpCodeEntity],
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    migrationsRun: false,
    synchronize: false,
    logging,
  };
}
