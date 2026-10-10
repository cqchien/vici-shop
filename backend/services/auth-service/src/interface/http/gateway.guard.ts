import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

import { SKIP_GATEWAY_CHECK } from './decorators/skip-gateway-check.decorator';
import { ApiConfigService } from '../../shared/config';
import { DirectAccessForbiddenError } from '../../shared';

export const GATEWAY_SECRET_HEADER = 'x-gateway-secret';

@Injectable()
export class GatewayOnlyGuard implements CanActivate {
  constructor(
    @Inject(ApiConfigService) private readonly config: ApiConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_GATEWAY_CHECK, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const providedSecret = request.headers[GATEWAY_SECRET_HEADER];

    if (providedSecret !== this.config.gatewaySharedSecret) {
      throw new DirectAccessForbiddenError('This request did not come through the API gateway');
    }
    return true;
  }
}
