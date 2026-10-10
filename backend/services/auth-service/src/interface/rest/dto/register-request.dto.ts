import { EmailField, PasswordField } from '../decorators/field.decorators';

export class RegisterRequestDto {
  @EmailField({ description: 'Login email.' })
  email!: string;

  @PasswordField({ description: 'Must contain a lowercase letter, an uppercase letter and a digit.' })
  password!: string;
}
