import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from '../auth/dto/register.dto';
import { PrismaService } from '../prisma/prisma.service';
import { WalletClientService } from '../wallet-client/wallet-client.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private prisma: PrismaService,
    private walletClientService: WalletClientService,
  ) {}

  async create(registerDto: RegisterDto) {
    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Create user — unique constraint on email handles duplicates atomically
    let user: Prisma.UserGetPayload<object>;
    try {
      user = await this.prisma.user.create({
        data: {
          email: registerDto.email,
          password: hashedPassword,
          first_name: registerDto.first_name,
          last_name: registerDto.last_name,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('User already exists');
      }
      throw error;
    }

    this.logger.log(`User created: id=${user.id}, email=${user.email}`);

    // Try to create wallet
    try {
      await this.walletClientService.createWallet(user.id);
      this.logger.log(`Wallet created successfully for user: id=${user.id}`);
    } catch (error) {
      this.logger.error(
        `Wallet creation failed for user: id=${user.id}, email=${user.email}`,
        error.stack,
      );
      this.logger.warn(`Initiating rollback: deleting user id=${user.id}`);

      // Rollback: delete user if wallet creation fails
      try {
        await this.prisma.user.delete({ where: { id: user.id } });
        this.logger.log(`Rollback successful: user id=${user.id} deleted`);
      } catch (rollbackError) {
        this.logger.error(
          `Rollback failed: unable to delete user id=${user.id}`,
          rollbackError.stack,
        );
        throw new InternalServerErrorException(
          'User registration failed and could not be rolled back',
        );
      }

      throw new ServiceUnavailableException(
        'User registration failed due to a downstream service error',
      );
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
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, updateUserDto: UpdateUserDto) {
    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: updateUserDto,
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          created_at: true,
          updated_at: true,
        },
      });

      this.logger.log(`User profile updated: id=${userId}`);
      return updatedUser;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }
}
