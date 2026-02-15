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
      // Execute transaction - idempotency check happens via DB constraint
      const result = await this.prisma.$transaction(async (tx) => {
        // Create transaction record FIRST - duplicate fails here before balance update
        const transaction = await tx.transaction.create({
          data: {
            user_id: userId,
            amount: new Decimal(dto.amount),
            type: dto.type,
            idempotency_key: dto.idempotencyKey,
          },
        });

        // Get wallet
        const wallet = await tx.wallet.findUnique({
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
          await tx.wallet.update({
            where: { user_id: userId },
            data: { balance: { decrement: new Decimal(dto.amount) } },
          });
        } else {
          // Update balance (credit)
          await tx.wallet.update({
            where: { user_id: userId },
            data: { balance: { increment: new Decimal(dto.amount) } },
          });
        }

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
