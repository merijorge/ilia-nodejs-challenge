import { TransactionType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateTransactionDto {
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  amount: number;

  @IsEnum(TransactionType)
  @IsNotEmpty()
  type: TransactionType;

  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;
}
