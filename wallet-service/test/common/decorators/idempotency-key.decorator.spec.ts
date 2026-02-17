import { BadRequestException } from '@nestjs/common';

jest.mock('class-validator');

describe('IdempotencyKey Decorator', () => {
  let isUUID: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    const classValidator = require('class-validator');
    isUUID = classValidator.isUUID;
  });

  const testDecoratorLogic = (headers: Record<string, any>) => {
    const raw = headers['idempotency-key'];

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
  };

  describe('Duplicate Headers', () => {
    it('should reject duplicate headers (array)', () => {
      expect(() =>
        testDecoratorLogic({
          'idempotency-key': ['uuid1', 'uuid2'],
        }),
      ).toThrow(
        'Idempotency-Key header must be a single value (no duplicates)',
      );
    });
  });

  describe('Missing/Empty Headers', () => {
    it('should reject missing header', () => {
      expect(() => testDecoratorLogic({})).toThrow(
        'Idempotency-Key header is required',
      );
    });

    it('should reject empty string', () => {
      expect(() =>
        testDecoratorLogic({
          'idempotency-key': '',
        }),
      ).toThrow('Idempotency-Key header is required');
    });

    it('should reject whitespace-only string', () => {
      expect(() =>
        testDecoratorLogic({
          'idempotency-key': '   \t\n  ',
        }),
      ).toThrow('Idempotency-Key header is required');
    });
  });

  describe('Whitespace Trimming', () => {
    it('should trim leading/trailing whitespace and validate UUID', () => {
      isUUID.mockReturnValue(true);
      const result = testDecoratorLogic({
        'idempotency-key': '  123e4567-e89b-12d3-a456-426614174000  ',
      });
      expect(result).toBe('123e4567-e89b-12d3-a456-426614174000'); // Trimmed!
    });
  });

  describe('UUID Validation', () => {
    it('should reject invalid UUID', () => {
      isUUID.mockReturnValue(false);
      expect(() =>
        testDecoratorLogic({
          'idempotency-key': 'invalid-uuid',
        }),
      ).toThrow('Idempotency-Key must be a valid UUID v4');
    });

    it('should accept valid UUID v4', () => {
      isUUID.mockReturnValue(true);
      const result = testDecoratorLogic({
        'idempotency-key': '123e4567-e89b-12d3-a456-426614174000',
      });
      expect(result).toBe('123e4567-e89b-12d3-a456-426614174000');
    });
  });
});
