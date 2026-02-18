import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWalletDto } from './dto/create-wallet.dto';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private prisma: PrismaService) {}

  async createWallet(dto: CreateWalletDto) {
    try {
      const wallet = await this.prisma.wallet.create({
        data: {
          user_id: dto.userId,
          balance: 0,
        },
      });

      this.logger.log(`Wallet created for user ${dto.userId} with balance 0`);
      return wallet;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Wallet already exists for this user');
      }
      throw error;
    }
  }

  async getBalance(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { user_id: userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return {
      userId: wallet.user_id,
      balance: Number(wallet.balance),
      createdAt: wallet.created_at,
      updatedAt: wallet.updated_at,
    };
  }

  async verifyBalanceIntegrity(userId: string): Promise<{
    storedBalance: number;
    calculatedBalance: number;
    isConsistent: boolean;
    transactionCount: number;
    discrepancy: number;
  }> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { user_id: userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // Calculate balance from transaction history (O(N) operation, only for verification)
    const transactions = await this.prisma.transaction.findMany({
      where: { user_id: userId },
    });

    const calculatedBalance = transactions.reduce((sum, tx) => {
      return tx.type === 'CREDIT'
        ? sum + Number(tx.amount)
        : sum - Number(tx.amount);
    }, 0);

    const storedBalance = Number(wallet.balance);
    const discrepancy = Math.abs(storedBalance - calculatedBalance);
    const isConsistent = discrepancy < 0.01;

    if (!isConsistent) {
      this.logger.warn(
        `Balance inconsistency detected for user ${userId}: stored=${storedBalance}, calculated=${calculatedBalance}, discrepancy=${discrepancy}`,
      );
    }

    return {
      storedBalance: Math.round(storedBalance * 100) / 100,
      calculatedBalance: Math.round(calculatedBalance * 100) / 100,
      isConsistent,
      transactionCount: transactions.length,
      discrepancy: Math.round(discrepancy * 100) / 100,
    };
  }
}
