import { Injectable } from '@nestjs/common';

import { Clock } from '../../domain/port/clock.port';

/** The one place the real wall clock enters the service (ADR-013). */
@Injectable()
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
