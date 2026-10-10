import { CreateDateColumn, PrimaryColumn } from 'typeorm';

export abstract class AbstractEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
