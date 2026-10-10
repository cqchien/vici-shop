import { ApiProperty } from '@nestjs/swagger';

export class AccountRegisteredDto {
  @ApiProperty({ format: 'uuid', example: '3f2504e0-4f89-11d3-9a0c-0305e82c3301' })
  accountId!: string;

  @ApiProperty({ example: true, description: 'Always true — the account must verify its email next.' })
  emailVerificationRequired!: boolean;
}
