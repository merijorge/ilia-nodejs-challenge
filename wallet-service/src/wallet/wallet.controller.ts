import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { InternalJwtGuard } from '../auth/guards/internal-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  // Internal route - called by User Service
  @Post('internal/create')
  @UseGuards(InternalJwtGuard)
  async createWallet(@Body() createWalletDto: CreateWalletDto) {
    const wallet = await this.walletService.createWallet(createWalletDto);

    return {
      userId: wallet.user_id,
      balance: Number(wallet.balance),
      createdAt: wallet.created_at,
      updatedAt: wallet.updated_at,
    };
  }

  // External route - called by users
  @Get('balance')
  @UseGuards(JwtAuthGuard)
  async getBalance(@Request() req) {
    const userId = req.user.userId;
    return await this.walletService.getBalance(userId);
  }
}
