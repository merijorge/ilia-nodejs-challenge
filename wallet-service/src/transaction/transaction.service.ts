import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionService {
  constructor(private prisma: PrismaService) {}

  async createTransaction(userId: string, dto: CreateTransactionDto) {
    // Check for duplicate idempotency key
    if (dto.idempotencyKey) {
      const existing = await this.prisma.transaction.findUnique({
        where: { idempotency_key: dto.idempotencyKey },
      });

      if (existing) {
        throw new ConflictException('Duplicate transaction detected');
      }
    }

    // Execute transaction in database transaction
    return await this.prisma.$transaction(async (prisma) => {
      // Get wallet with lock
      const wallet = await prisma.wallet.findUnique({
        where: { user_id: userId },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      // Check balance for debit
      if (dto.type === TransactionType.DEBIT) {
        const currentBalance = Number(wallet.balance);
        if (currentBalance < dto.amount) {
          throw new BadRequestException('Insufficient funds');
        }

        // Update balance (debit)
        await prisma.wallet.update({
          where: { user_id: userId },
          data: { balance: { decrement: new Decimal(dto.amount) } },
        });
      } else {
        // Update balance (credit)
        await prisma.wallet.update({
          where: { user_id: userId },
          data: { balance: { increment: new Decimal(dto.amount) } },
        });
      }

      // Create transaction record
      const transaction = await prisma.transaction.create({
        data: {
          user_id: userId,
          amount: new Decimal(dto.amount),
          type: dto.type,
          idempotency_key: dto.idempotencyKey,
        },
      });

      return transaction;
    });
  }

  async getUserTransactions(userId: string) {
    return await this.prisma.transaction.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
  }
}
