import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { isUUID } from 'class-validator';

export const IdempotencyKey = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const raw = request.headers['idempotency-key']; // always lowercase

    // Reject arrays/duplicates (IETF compliance)
    if (Array.isArray(raw)) {
      throw new BadRequestException(
        'Idempotency-Key header must be a single value (no duplicates)',
      );
    }

    if (typeof raw !== 'string' || raw.trim().length === 0) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    const key = raw.trim();

    if (!isUUID(key, '4')) {
      throw new BadRequestException('Idempotency-Key must be a valid UUID v4');
    }

    return key;
  },
);
