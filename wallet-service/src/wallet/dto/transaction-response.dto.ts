import { TransactionType } from '@prisma/client';

export class TransactionResponseDto {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  createdAt: Date;
}
