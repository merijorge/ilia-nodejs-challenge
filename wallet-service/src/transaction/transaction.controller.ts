import {
  Body,
  Controller,
  Get,
  Post,
  HttpCode,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IdempotencyKey } from '../common/decorators/idempotency-key.decorator';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionService } from './transaction.service';

@ApiTags('transactions')
@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create transaction (CREDIT or DEBIT)',
    description:
      'Idempotent: same Idempotency-Key returns same transaction (201)',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    description:
      'Required UUID v4 for idempotency. Duplicate requests return existing transaction.',
    required: true,
    example: '123e4567-e89b-12d3-a456-426614174000',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 201,
    description:
      'Transaction created or existing idempotent transaction returned',
    schema: {
      example: {
        id: 'uuid',
        userId: 'user-uuid',
        amount: 100.5,
        type: 'CREDIT',
        createdAt: '2026-02-17T12:00:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or insufficient funds',
  })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  @ApiResponse({
    status: 422,
    description: 'Idempotency key reused with different payload',
  })

  async createTransaction(
    @Body() createTransactionDto: CreateTransactionDto,
    @IdempotencyKey() idempotencyKey: string,
    @Request() req,
  ) {
    const userId = req.user.userId;

    const transaction = await this.transactionService.createTransaction(
      userId,
      { ...createTransactionDto, idempotencyKey },
    );

    return {
      id: transaction.id,
      userId: transaction.user_id,
      amount: Number(transaction.amount),
      type: transaction.type,
      createdAt: transaction.created_at,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List user transactions' })
  @ApiResponse({
    status: 200,
    description: 'User transactions (newest first)',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          amount: { type: 'number', format: 'float' },
          type: { type: 'string', enum: ['CREDIT', 'DEBIT'] },
          createdAt: { type: 'string', format: 'date-time' }
        }
      }
    }
  })

  async getTransactions(@Request() req) {
    const userId = req.user.userId;
    const transactions =
      await this.transactionService.getUserTransactions(userId);

    return transactions.map((t) => ({
      id: t.id,
      userId: t.user_id,
      amount: Number(t.amount),
      type: t.type,
      createdAt: t.created_at,
    }));
  }
}
