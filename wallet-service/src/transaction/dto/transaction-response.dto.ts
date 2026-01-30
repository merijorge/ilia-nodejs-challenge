import { TransactionType } from '@prisma/client';

export class TransactionResponseDto {
  id: string;
  userId: number;
  amount: number;
  type: TransactionType;
  createdAt: Date;
}
