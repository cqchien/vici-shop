import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiConflictResponse, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AccountRegisteredDto } from './dto/account-registered.dto';
import { RegisterRequestDto } from './dto/register-request.dto';
import { RegisterAccountUseCase } from '../../application/use-case';
import { RegisterAccountResult } from '../../application/dto/register-account.io';

@ApiTags('auth')
@Controller('v1/auth')
export class AuthController {
  constructor(private readonly registerAccount: RegisterAccountUseCase) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register with account',
    description:
      'Creates an unverified customer account and issues a verify-email OTP',
  })
  @ApiCreatedResponse({ type: AccountRegisteredDto })
  @ApiConflictResponse({ description: 'EMAIL_ALREADY_REGISTERED — an account already exists for this tenant.' })
  register(@Body() dto: RegisterRequestDto): Promise<RegisterAccountResult> {
    return this.registerAccount.execute({ email: dto.email, password: dto.password });
  }
}
