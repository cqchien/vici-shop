import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { CLS_REQUEST_ID, uuidV7, success, SuccessEnvelope } from '../../shared';

@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<T, SuccessEnvelope<T>> {
  constructor(private readonly cls: ClsService) {}

  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<SuccessEnvelope<T>> {
    return next.handle().pipe(
      map((payload): SuccessEnvelope<T> => {
        if (
          payload !== null &&
          typeof payload === 'object' &&
          'data' in payload &&
          'meta' in payload
        ) {
          return payload as unknown as SuccessEnvelope<T>;
        }
        const requestId = this.cls.get<string | undefined>(CLS_REQUEST_ID) ?? uuidV7();
        return success(payload, requestId);
      }),
    );
  }
}
