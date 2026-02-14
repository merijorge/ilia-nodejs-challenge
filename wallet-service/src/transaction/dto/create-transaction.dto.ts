import { TransactionType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateTransactionDto {
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Amount must have at most 2 decimal places' },
  )
  @Min(0.01, { message: 'Amount must be at least 0.01' })
  @Max(1000000, { message: 'Amount cannot exceed 1,000,000' })
  @IsNotEmpty()
  @Transform(({ value }) => {
    const num = parseFloat(value);
    return isNaN(num) ? value : Math.round(num * 100) / 100;
  })
  amount: number;

  @IsEnum(TransactionType, { message: 'Type must be either CREDIT or DEBIT' })
  @IsNotEmpty()
  type: TransactionType;

  @IsUUID('4', { message: 'Idempotency key must be a valid UUID v4' })
  @IsNotEmpty()
  idempotencyKey: string;
}
