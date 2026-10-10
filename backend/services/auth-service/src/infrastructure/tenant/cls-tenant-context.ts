import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

import {
  CLS_REQUEST_ID,
  CLS_TENANT_ID,
  MissingTenantContextError,
  uuidV7,
} from '../../shared';
import { TenantContextPort } from '../../domain/port';

/**
 * Reads the ambient request context populated by edge middleware.
 */
@Injectable()
export class ClsTenantContext implements TenantContextPort {
  constructor(private readonly cls: ClsService) {}

  currentTenantId(): string {
    const value = this.cls.get<string | undefined>(CLS_TENANT_ID);
    if (!value) {
      throw new MissingTenantContextError('Tenant context is required but was not provided');
    }
    return value;
  }

  currentRequestId(): string {
    let value = this.cls.get<string | undefined>(CLS_REQUEST_ID);
    if (!value) {
      value = uuidV7();
      this.cls.set(CLS_REQUEST_ID, value);
    }
    return value;
  }
}
