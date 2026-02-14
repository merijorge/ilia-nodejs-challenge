import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @Length(1, 100, {
    message: 'First name must be between 1 and 100 characters',
  })
  @Matches(/^[a-zA-ZÀ-ÿ\s'-]+$/, {
    message:
      'First name can only contain letters, spaces, hyphens, and apostrophes',
  })
  @Transform(({ value }) => value?.trim())
  first_name?: string;

  @IsString()
  @IsOptional()
  @Length(1, 100, { message: 'Last name must be between 1 and 100 characters' })
  @Matches(/^[a-zA-ZÀ-ÿ\s'-]+$/, {
    message:
      'Last name can only contain letters, spaces, hyphens, and apostrophes',
  })
  @Transform(({ value }) => value?.trim())
  last_name?: string;
}
