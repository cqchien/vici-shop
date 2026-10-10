export const OTP_GENERATOR = 'OTP_GENERATOR';

/** Outbound port for producing OTP codes. Adapter uses a CSPRNG. */
export interface OtpGenerator {
  /** A fresh 6-digit numeric code as a string (leading zeros preserved). */
  sixDigits(): string;
}
