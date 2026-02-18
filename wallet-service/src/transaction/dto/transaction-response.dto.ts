import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';

export class TransactionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  userId: string;

  @ApiProperty({ example: 100.5 })
  amount: number;

  @ApiProperty({ enum: TransactionType })
  type: TransactionType;

  @ApiProperty()
  createdAt: Date;
}
