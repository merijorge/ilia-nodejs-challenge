import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(private prisma: PrismaService) {}

  async createTransaction(userId: string, dto: CreateTransactionDto) {
    // Check for duplicate idempotency key
    if (dto.idempotencyKey) {
      const existing = await this.prisma.transaction.findUnique({
        where: { idempotency_key: dto.idempotencyKey },
      });

      if (existing) {
        this.logger.warn(
          `Duplicate transaction attempt: idempotency_key=${dto.idempotencyKey}`,
        );
        throw new ConflictException('Duplicate transaction detected');
      }
    }

    const startTime = Date.now();

    // Execute transaction in database transaction
    const result = await this.prisma.$transaction(async (prisma) => {
      // Get wallet with lock
      const wallet = await prisma.wallet.findUnique({
        where: { user_id: userId },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const previousBalance = Number(wallet.balance);

      // Check balance for debit
      if (dto.type === TransactionType.DEBIT) {
        if (previousBalance < dto.amount) {
          this.logger.warn(
            `Insufficient funds: user=${userId}, balance=${previousBalance}, attempted=${dto.amount}`,
          );
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

      const newBalance =
        dto.type === TransactionType.CREDIT
          ? previousBalance + dto.amount
          : previousBalance - dto.amount;

      this.logger.log(
        `Transaction created: type=${dto.type}, amount=${dto.amount}, user=${userId}, balance=${previousBalance}→${newBalance.toFixed(2)}`,
      );

      return transaction;
    });

    const duration = Date.now() - startTime;
    this.logger.debug(
      `Transaction completed in ${duration}ms (O(1) operation)`,
    );

    return result;
  }

  async getUserTransactions(userId: string) {
    const startTime = Date.now();

    const transactions = await this.prisma.transaction.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    const duration = Date.now() - startTime;
    this.logger.debug(
      `Retrieved ${transactions.length} transactions in ${duration}ms (O(N) operation)`,
    );

    return transactions;
  }
}
