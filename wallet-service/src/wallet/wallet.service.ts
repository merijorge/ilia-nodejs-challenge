import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWalletDto } from './dto/create-wallet.dto';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private prisma: PrismaService) {}

  async createWallet(dto: CreateWalletDto) {
    const existing = await this.prisma.wallet.findUnique({
      where: { user_id: dto.userId },
    });

    if (existing) {
      throw new ConflictException('Wallet already exists for this user');
    }

    const wallet = await this.prisma.wallet.create({
      data: {
        user_id: dto.userId,
        balance: 0,
      },
    });

    this.logger.log(`Wallet created for user ${dto.userId} with balance 0`);
    return wallet;
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
    const isConsistent = discrepancy < 0.01; // Allow for floating point precision

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

  async reconcileBalance(userId: string): Promise<{
    previousBalance: number;
    correctedBalance: number;
    wasInconsistent: boolean;
  }> {
    const verification = await this.verifyBalanceIntegrity(userId);

    if (verification.isConsistent) {
      return {
        previousBalance: verification.storedBalance,
        correctedBalance: verification.storedBalance,
        wasInconsistent: false,
      };
    }

    // Update balance to match calculated value
    await this.prisma.wallet.update({
      where: { user_id: userId },
      data: { balance: verification.calculatedBalance },
    });

    this.logger.log(
      `Balance reconciled for user ${userId}: ${verification.storedBalance} → ${verification.calculatedBalance}`,
    );

    return {
      previousBalance: verification.storedBalance,
      correctedBalance: verification.calculatedBalance,
      wasInconsistent: true,
    };
  }
}
