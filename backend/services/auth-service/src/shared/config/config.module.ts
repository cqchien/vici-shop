import { Global, Module } from '@nestjs/common';

import { ApiConfigService } from './api-config.service';

/** Global so `ApiConfigService` is injectable everywhere, incl. `TypeOrmModule.forRootAsync`. */
@Global()
@Module({
  providers: [ApiConfigService],
  exports: [ApiConfigService],
})
export class ConfigModule {}
