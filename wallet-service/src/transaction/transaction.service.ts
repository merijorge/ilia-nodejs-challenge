import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(private prisma: PrismaService) {}

  async createTransaction(userId: string, dto: CreateTransactionDto) {
    const startTime = Date.now();

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Validate wallet existence
        const wallet = await tx.wallet.findUnique({
          where: { user_id: userId },
        });

        if (!wallet) {
          this.logger.error(
            `Wallet not found for transaction: userId=${userId}`,
          );
          throw new NotFoundException('Wallet not found');
        }

        // Convert amount once for reuse
        const amount = new Decimal(dto.amount);

        // Create transaction record (duplicates fail here via unique constraint)
        const transaction = await tx.transaction.create({
          data: {
            user_id: userId,
            amount: amount,
            type: dto.type,
            idempotency_key: dto.idempotencyKey,
          },
        });

        // Update balance atomically based on type
        if (dto.type === TransactionType.CREDIT) {
          // CREDIT: Increment (safe - can't go negative)
          await tx.wallet.update({
            where: { user_id: userId },
            data: { balance: { increment: amount } },
          });

          this.logger.log(
            `Transaction created: type=CREDIT, amount=${dto.amount}, user=${userId}`,
          );
        } else {
          // DEBIT: Conditional update (atomic check + decrement)
          const updateResult = await tx.wallet.updateMany({
            where: {
              user_id: userId,
              balance: { gte: amount },
            },
            data: { balance: { decrement: amount } },
          });

          // If count is 0, insufficient funds
          // Note: In this domain, wallets are never deleted, so count===0 
          // definitively means insufficient funds, not "wallet not found"
          if (updateResult.count === 0) {
            this.logger.warn(
              `Insufficient funds: user=${userId}, attempted=${dto.amount}`,
            );
            throw new BadRequestException('Insufficient funds');
          }

          this.logger.log(
            `Transaction created: type=DEBIT, amount=${dto.amount}, user=${userId}`,
          );
        }

        return transaction;
      });

      const duration = Date.now() - startTime;
      this.logger.debug(
        `Transaction completed in ${duration}ms (O(1) operation)`,
      );

      return result;
    } catch (error) {
      // Handle Prisma unique constraint violation (duplicate idempotency key)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.log(
          `Idempotent request: returning existing transaction for idempotency_key=${dto.idempotencyKey}`,
        );

        // True idempotency: Return existing transaction instead of error
        const existingTransaction = await this.prisma.transaction.findUnique({
          where: { idempotency_key: dto.idempotencyKey },
        });

        if (existingTransaction) {
          const duration = Date.now() - startTime;
          this.logger.debug(`Idempotent response returned in ${duration}ms`);
          return existingTransaction;
        }

        // Fallback (should never happen, but for safety)
        this.logger.error(
          `P2002 error but transaction not found: idempotency_key=${dto.idempotencyKey}`,
        );
        throw new BadRequestException(
          'Transaction conflict - please retry with a new idempotency key',
        );
      }

      // Re-throw other errors
      throw error;
    }
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
