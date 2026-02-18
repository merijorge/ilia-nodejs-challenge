import { TransactionType } from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  Max,
  Min,
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';

function IsDecimal(decimals: number, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isDecimal',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [decimals],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [maxDecimals] = args.constraints as [number];
          if (typeof value !== 'number') return false;
          const decimalPart = value.toString().split('.')[1];
          if (!decimalPart) return true;
          return decimalPart.length <= maxDecimals;
        },
        defaultMessage(args: ValidationArguments) {
          const [maxDecimals] = args.constraints as [number];
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
  amount: number;

  @IsEnum(TransactionType, { message: 'Type must be either CREDIT or DEBIT' })
  type: TransactionType;
}
