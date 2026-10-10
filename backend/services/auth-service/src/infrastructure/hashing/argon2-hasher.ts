import { Injectable } from '@nestjs/common';
import { hash, verify, Algorithm } from '@node-rs/argon2';

import { Hasher } from '../../domain/port/hasher.port';
import { ApiConfigService } from '../../shared/config/api-config.service';

/** argon2id hashing for passwords and OTP codes (spec §4: "hash password (bcrypt/argon2)"). */
@Injectable()
export class Argon2Hasher implements Hasher {
  constructor(private readonly config: ApiConfigService) {}

  hash(plaintext: string): Promise<string> {
    const { memoryCost, timeCost, parallelism } = this.config.argon2;
    return hash(plaintext, { algorithm: Algorithm.Argon2id, memoryCost, timeCost, parallelism });
  }

  async verify(plaintext: string, hashed: string): Promise<boolean> {
    try {
      return await verify(hashed, plaintext);
    } catch {
      // A malformed hash must not throw out of a login check.
      return false;
    }
  }
}
