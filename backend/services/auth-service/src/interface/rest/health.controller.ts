import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

import { SkipGatewayCheck } from '../http/decorators/skip-gateway-check.decorator';

@ApiTags('health')
@SkipGatewayCheck()
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  @ApiOperation({ summary: 'Liveness — the process is up' })
  live(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness — the process can reach its database' })
  async ready(): Promise<{ status: string }> {
    await this.dataSource.query('SELECT 1');
    return { status: 'ready' };
  }
}
