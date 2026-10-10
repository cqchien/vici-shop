export const APP_CONFIG = 'APP_CONFIG';

/** The slice of validated configuration the application layer needs. */
export interface AppConfig {
  readonly otpTtlMinutes: number;
}
