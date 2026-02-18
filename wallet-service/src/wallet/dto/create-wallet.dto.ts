import { IsUUID } from 'class-validator';

export class CreateWalletDto {
  @IsUUID('4', { message: 'User ID must be a valid UUID v4' })
  userId: string;
}
