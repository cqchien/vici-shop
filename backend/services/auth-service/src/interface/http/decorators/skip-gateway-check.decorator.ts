import { SetMetadata } from '@nestjs/common';

export const SKIP_GATEWAY_CHECK = 'skipGatewayCheck';

/**
 * Exempts a route from `GatewayOnlyGuard`. Use ONLY for endpoints a container
 * orchestrator must reach directly, bypassing Kong — liveness/readiness probes. Never apply it
 * to a business route: that would defeat the whole point of the guard.
 */
export const SkipGatewayCheck = (): ClassDecorator & MethodDecorator =>
  SetMetadata(SKIP_GATEWAY_CHECK, true);
