import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { InternalJwtGuard } from '../auth/guards/internal-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { WalletService } from './wallet.service';

interface AuthenticatedRequest {
  user: { userId: string; email: string };
}

@ApiTags('wallet')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('internal/create')
  @UseGuards(InternalJwtGuard)
  @ApiSecurity('bearer')
  @ApiOperation({
    summary: 'Create wallet (internal)',
    description:
      'Service-to-service endpoint. Requires internal JWT signed with JWT_INTERNAL_KEY, not the user-facing bearer token.',
  })
  @ApiResponse({
    status: 201,
    description: 'Wallet created',
    schema: {
      example: {
        userId: 'uuid',
        balance: 0,
        createdAt: '2026-02-17T12:00:00Z',
        updatedAt: '2026-02-17T12:00:00Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid internal JWT' })
  @ApiResponse({ status: 409, description: 'Wallet already exists for user' })
  async createWallet(@Body() createWalletDto: CreateWalletDto) {
    const wallet = await this.walletService.createWallet(createWalletDto);

    return {
      userId: wallet.user_id,
      balance: Number(wallet.balance),
      createdAt: wallet.created_at,
      updatedAt: wallet.updated_at,
    };
  }

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get wallet balance' })
  @ApiResponse({
    status: 200,
    description: 'Current wallet balance',
    schema: {
      example: {
        userId: 'uuid',
        balance: 1000.5,
        createdAt: '2026-02-17T12:00:00Z',
        updatedAt: '2026-02-17T12:30:00Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async getBalance(@Request() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    return await this.walletService.getBalance(userId);
  }

  @Get('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify balance integrity',
    description:
      'Diagnostic endpoint. Compares stored balance against sum of transaction history. This is an O(N) operation and is intended for auditing only, not regular use.',
  })
  @ApiResponse({
    status: 200,
    description: 'Balance integrity report',
    schema: {
      example: {
        storedBalance: 1000.5,
        calculatedBalance: 1000.5,
        isConsistent: true,
        transactionCount: 42,
        discrepancy: 0,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid token' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async verifyBalance(@Request() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    return await this.walletService.verifyBalanceIntegrity(userId);
  }
}
