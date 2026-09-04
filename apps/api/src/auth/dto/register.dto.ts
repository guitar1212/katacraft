import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @Length(8, 72)
  password: string;

  @IsString()
  @Length(1, 80)
  @Matches(/^[^<>]*$/, { message: 'name must not contain < or >' })
  name: string;
}
