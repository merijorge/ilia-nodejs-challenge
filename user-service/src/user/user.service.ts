import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from '../dto/register.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { WalletClientService } from '../wallet-client/wallet-client.service';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private walletClientService: WalletClientService,
  ) {}

  async create(registerDto: RegisterDto) {
    // 1. Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // 3. Create user
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        password: hashedPassword,
        first_name: registerDto.first_name,
        last_name: registerDto.last_name,
      },
    });

    // 4. Try to create wallet
    try {
      await this.walletClientService.createWallet(user.id);
    } catch (error) {
      console.error('Wallet creation error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      // 5. Rollback: delete user if wallet creation fails
      await this.prisma.user.delete({ where: { id: user.id } });
      throw new Error('Failed to create wallet for user');
    }

    return user;
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
