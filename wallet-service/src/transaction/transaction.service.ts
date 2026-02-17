import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';

interface CreateTransactionInput {
  amount: number;
  type: TransactionType;
  idempotencyKey: string;
}

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(private prisma: PrismaService) {}

  async createTransaction(userId: string, dto: CreateTransactionInput) {
    const startTime = Date.now();

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.findUnique({
          where: { user_id: userId },
        });

        if (!wallet) {
          this.logger.error(
            `Wallet not found for transaction: userId=${userId}`,
          );
          throw new NotFoundException('Wallet not found');
        }

        const amount = new Decimal(dto.amount);

        const transaction = await tx.transaction.create({
          data: {
            user_id: userId,
            amount: amount,
            type: dto.type,
            idempotency_key: dto.idempotencyKey,
          },
        });

        if (dto.type === TransactionType.CREDIT) {
          await tx.wallet.update({
            where: { user_id: userId },
            data: { balance: { increment: amount } },
          });

          this.logger.log(
            `Transaction created: type=CREDIT, amount=${dto.amount}, user=${userId}`,
          );
        } else {
          const updateResult = await tx.wallet.updateMany({
            where: {
              user_id: userId,
              balance: { gte: amount },
            },
            data: { balance: { decrement: amount } },
          });

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
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.debug(
          `Duplicate idempotency key detected: user=${userId}, key=${dto.idempotencyKey}`,
        );

        const existingTransaction = await this.prisma.transaction.findUnique({
          where: {
            user_id_idempotency_key: {
              user_id: userId,
              idempotency_key: dto.idempotencyKey,
            },
          },
        });

        if (existingTransaction) {
          if (existingTransaction.user_id !== userId) {
            this.logger.error(
              `SECURITY: Ownership mismatch detected - should be impossible with scoped schema`,
            );
            throw new BadRequestException('Invalid request');
          }

          const attemptedAmount = new Decimal(dto.amount);
          const isSameType = existingTransaction.type === dto.type;
          const isSameAmount =
            existingTransaction.amount.equals(attemptedAmount);

          if (!isSameType || !isSameAmount) {
            this.logger.warn(
              `Idempotency key reused with different payload: ` +
                `user=${userId}, key=${dto.idempotencyKey}, ` +
                `original=(type=${existingTransaction.type}, amount=${existingTransaction.amount}), ` +
                `attempted=(type=${dto.type}, amount=${dto.amount})`,
            );

            throw new UnprocessableEntityException(
              'Idempotency key was previously used with a different request',
            );
          }

          const duration = Date.now() - startTime;
          this.logger.debug(
            `Idempotent request: returning existing transaction id=${existingTransaction.id} (${duration}ms)`,
          );

          return existingTransaction;
        }

        this.logger.error(
          `P2002 error but transaction not found: user=${userId}, key=${dto.idempotencyKey}`,
        );
        throw new BadRequestException('Transaction conflict');
      }

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
