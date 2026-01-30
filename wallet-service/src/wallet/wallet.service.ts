import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWalletDto } from './dto/create-wallet.dto';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  async createWallet(dto: CreateWalletDto) {
    // Check if wallet already exists
    const existing = await this.prisma.wallet.findUnique({
      where: { user_id: dto.userId },
    });

    if (existing) {
      throw new ConflictException('Wallet already exists for this user');
    }

    return await this.prisma.wallet.create({
      data: {
        user_id: dto.userId,
        balance: 0,
      },
    });
  }

  async getBalance(userId: number) {
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
}
