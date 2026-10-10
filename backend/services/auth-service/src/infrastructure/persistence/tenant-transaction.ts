import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

import { TENANT_CONTEXT, TenantContextPort } from '../../domain/port';

@Injectable()
export class TenantTransactionRunner {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(TENANT_CONTEXT) private readonly tenantContext: TenantContextPort,
  ) {}

  async run<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    const tenantId = this.tenantContext.currentTenantId(); // throws MissingTenantContextError
    return this.dataSource.transaction(async (manager) => {
      await manager.query(`SELECT set_config('app.tenant_id', $1, true)`, [tenantId]);
      return work(manager);
    });
  }
}
