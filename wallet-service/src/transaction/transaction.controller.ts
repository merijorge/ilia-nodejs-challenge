import { Controller, Post, Get, Body, UseGuards, Request, Headers } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  async createTransaction(
    @Request() req,
    @Body() createTransactionDto: CreateTransactionDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const userId = req.user.userId;
    
    // Add idempotency key from header if provided
    if (idempotencyKey) {
      createTransactionDto.idempotencyKey = idempotencyKey;
    }

    const transaction = await this.transactionService.createTransaction(
      userId,
      createTransactionDto,
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
    const transactions = await this.transactionService.getUserTransactions(userId);

    return transactions.map((t) => ({
      id: t.id,
      userId: t.user_id,
      amount: Number(t.amount),
      type: t.type,
      createdAt: t.created_at,
    }));
  }
}
