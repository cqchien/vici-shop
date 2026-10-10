export const LOGGER = 'LOGGER';

type Fields = Record<string, unknown>;

export interface LoggerPort {
  info(message: string, fields?: Fields): void;
  warn(message: string, fields?: Fields): void;
  debug(message: string, fields?: Fields): void;
  error(message: string, error?: unknown, fields?: Fields): void;
}
