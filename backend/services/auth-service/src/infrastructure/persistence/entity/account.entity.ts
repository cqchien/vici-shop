import { Column, Entity } from 'typeorm';

import { AbstractEntity } from './abstract.entity';
import type { AccountRole } from '../../../domain/model';

@Entity({ name: 'accounts' })
export class AccountEntity extends AbstractEntity {
  @Column('uuid')
  tenantId!: string;

  @Column('text')
  email!: string;

  @Column('text')
  passwordHash!: string;

  @Column('text', { default: 'customer' })
  role!: AccountRole;

  @Column('boolean', { default: false })
  locked!: boolean;

  @Column('timestamptz', { nullable: true })
  emailVerifiedAt!: Date | null;
}
