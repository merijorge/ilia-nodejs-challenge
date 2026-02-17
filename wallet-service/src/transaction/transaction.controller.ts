import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IdempotencyKey } from '../common/decorators/idempotency-key.decorator';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionService } from './transaction.service';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  async createTransaction(
    @Request() req,
    @Body() createTransactionDto: CreateTransactionDto,
    @IdempotencyKey() idempotencyKey: string,
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
