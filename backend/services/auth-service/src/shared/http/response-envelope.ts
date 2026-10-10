export interface SuccessEnvelope<T> {
  data: T;
  meta: { requestId: string } & Record<string, unknown>;
}

export interface ErrorEnvelope {
  error: { code: string; message: string; field: string | null };
}

export function success<T>(
  data: T,
  requestId: string,
  extraMeta: Record<string, unknown> = {},
): SuccessEnvelope<T> {
  return { data, meta: { requestId, ...extraMeta } };
}

export function errorBody(
  code: string,
  message: string,
  field: string | null = null,
): ErrorEnvelope {
  return { error: { code, message, field } };
}
