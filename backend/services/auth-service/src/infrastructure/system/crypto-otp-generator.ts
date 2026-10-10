import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';

import { OtpGenerator } from '../../domain/port/otp-generator.port';

@Injectable()
export class CryptoOtpGenerator implements OtpGenerator {
  sixDigits(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }
}
