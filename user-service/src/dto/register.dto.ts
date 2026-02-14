import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100, {
    message: 'First name must be between 1 and 100 characters',
  })
  @Matches(/^[a-zA-ZÀ-ÿ\s'-]+$/, {
    message:
      'First name can only contain letters, spaces, hyphens, and apostrophes',
  })
  @Transform(({ value }) => value?.trim())
  first_name: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100, { message: 'Last name must be between 1 and 100 characters' })
  @Matches(/^[a-zA-ZÀ-ÿ\s'-]+$/, {
    message:
      'Last name can only contain letters, spaces, hyphens, and apostrophes',
  })
  @Transform(({ value }) => value?.trim())
  last_name: string;
}
