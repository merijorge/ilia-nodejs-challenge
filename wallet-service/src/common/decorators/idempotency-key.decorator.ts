import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { isUUID } from 'class-validator';

export const IdempotencyKey = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const raw = request.headers['idempotency-key'] as
      | string
      | string[]
      | undefined;

    // Normalize: handle string | string[] | undefined
    const key = Array.isArray(raw) ? raw[0] : raw;

    // Treat empty string as missing
    if (typeof key !== 'string' || key.length === 0) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    // Validate UUID v4 using class-validator
    if (!isUUID(key, '4')) {
      throw new BadRequestException('Idempotency-Key must be a valid UUID v4');
    }

    return key;
  },
);
