export const HASHER = 'HASHER';

/**
 * Outbound port for one-way hashing of secrets (password, OTP code). The domain does not know
 * or care about the algorithm — the adapter (argon2id) owns that. `verify` is constant-time.
 */
export interface Hasher {
  hash(plaintext: string): Promise<string>;
  verify(plaintext: string, hash: string): Promise<boolean>;
}
