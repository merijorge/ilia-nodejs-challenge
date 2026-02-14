import { TransactionType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsUUID,
  Max,
  Min,
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';

// Custom decorator for decimal places validation
function IsDecimal(decimals: number, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isDecimal',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [decimals],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [maxDecimals] = args.constraints;
          if (typeof value !== 'number') return false;

          const decimalPart = value.toString().split('.')[1];
          if (!decimalPart) return true; // No decimals is valid

          return decimalPart.length <= maxDecimals;
        },
        defaultMessage(args: ValidationArguments) {
          const [maxDecimals] = args.constraints;
          return `${args.property} must have at most ${maxDecimals} decimal places`;
        },
      },
    });
  };
}

export class CreateTransactionDto {
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0.01, { message: 'Amount must be at least 0.01' })
  @Max(1000000, { message: 'Amount cannot exceed 1,000,000' })
  @IsDecimal(2, { message: 'Amount must have at most 2 decimal places' })
  @IsNotEmpty()
  amount: number;

  @IsEnum(TransactionType, { message: 'Type must be either CREDIT or DEBIT' })
  @IsNotEmpty()
  type: TransactionType;

  @IsUUID('4', { message: 'Idempotency key must be a valid UUID v4' })
  @IsNotEmpty()
  idempotencyKey: string;
}
