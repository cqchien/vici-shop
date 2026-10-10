import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptions } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

type FieldOptions = Pick<ApiPropertyOptions, 'description' | 'example'>;

export function EmailField(options: FieldOptions = {}): PropertyDecorator {
  return applyDecorators(
    IsString(),
    IsEmail({}, { message: 'email must be a valid email address' }),
    MaxLength(254),
    ApiProperty({
      type: String,
      format: 'email',
      example: 'buyer@shop.test',
      ...options,
    }),
  );
}

export function PasswordField(options: FieldOptions & { minLength?: number } = {}): PropertyDecorator {
  const minLength = options.minLength ?? 8;
  return applyDecorators(
    IsString(),
    MinLength(minLength, { message: `password must be at least ${minLength} characters` }),
    MaxLength(128),
    ApiProperty({
      type: String,
      format: 'password',
      minLength,
      maxLength: 128,
      example: 'Passw0rd!',
      ...options,
    }),
  );
}
