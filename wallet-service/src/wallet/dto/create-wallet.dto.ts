import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateWalletDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;
}
