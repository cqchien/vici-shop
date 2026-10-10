import { Column, Entity } from 'typeorm';

import { AbstractEntity } from './abstract.entity';
import type { OtpPurpose } from '../../../domain/model';

@Entity({ name: 'otp_codes' })
export class OtpCodeEntity extends AbstractEntity {
  @Column('uuid')
  tenantId!: string;

  @Column('uuid')
  accountId!: string;

  @Column('text')
  codeHash!: string;

  @Column('text')
  purpose!: OtpPurpose;

  @Column('timestamptz')
  expiresAt!: Date;

  @Column('timestamptz', { nullable: true })
  consumedAt!: Date | null;
}
