import { Global, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

import { AppLogger } from './app-logger.service';
import { buildPinoParams } from './pino-params';
import { ApiConfigService } from '../config';
import { ConfigModule } from '../config/config.module';
import { LOGGER } from './logger.port';

/**
 * Wires nestjs-pino (transport, redaction, per-request child loggers, one-line HTTP logs)
 */
@Global()
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ApiConfigService],
      useFactory: buildPinoParams,
    }),
  ],
  providers: [{ provide: LOGGER, useClass: AppLogger }],
  exports: [LOGGER, PinoLoggerModule],
})
export class LoggingModule {}
