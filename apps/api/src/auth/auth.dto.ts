import { IsString, MinLength } from "class-validator";

export class RegisterDto {
  @IsString()
  name!: string;

  @IsString()
  email!: string;

  @IsString()
  password!: string;
}

export class LoginDto {
  @IsString()
  email!: string;

  @IsString()
  password!: string;
}

export class ResetCodeDto {
  @IsString()
  email!: string;
}

export class VerifyResetDto {
  @IsString()
  email!: string;

  @IsString()
  code!: string;
}

export class ResetPasswordDto {
  @IsString()
  email!: string;

  @IsString()
  code!: string;

  @IsString()
  @MinLength(1)
  newPassword!: string;
}
