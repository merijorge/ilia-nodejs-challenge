import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class CreateWalletDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  userId: number;
}
