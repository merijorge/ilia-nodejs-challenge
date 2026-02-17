import {
  Controller,
  Get,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IdempotencyKey } from '../../../src/common/decorators/idempotency-key.decorator';
const request = require('supertest');

@Controller('test')
class TestController {
  @Get()
  handle(@IdempotencyKey() key: string) {
    return { key };
  }
}

describe('IdempotencyKey Decorator', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [TestController],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Duplicate Headers', () => {
    it('should reject duplicate headers (array)', async () => {
      // Node.js HTTP combines duplicate header values into a comma-separated
      // string before the decorator receives them. The combined value
      // "uuid1, uuid2" is not a valid UUID v4, so the request is rejected
      // with 400 at UUID validation. The Array.isArray guard in the decorator
      // is defensive code for non-HTTP contexts (e.g. raw Node.js streams).
      const response = await request(app.getHttpServer())
        .get('/test')
        .set('idempotency-key', ['uuid1', 'uuid2']);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        'Idempotency-Key must be a valid UUID v4',
      );
    });
  });

  describe('Missing/Empty Headers', () => {
    it('should reject missing header', async () => {
      const response = await request(app.getHttpServer()).get('/test');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Idempotency-Key header is required');
    });

    it('should reject empty string', async () => {
      const response = await request(app.getHttpServer())
        .get('/test')
        .set('idempotency-key', '');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Idempotency-Key header is required');
    });

    it('should reject whitespace-only string', async () => {
      const response = await request(app.getHttpServer())
        .get('/test')
        .set('idempotency-key', '     ');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Idempotency-Key header is required');
    });
  });

  describe('Whitespace Trimming', () => {
    it('should trim leading/trailing whitespace and validate UUID', async () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app.getHttpServer())
        .get('/test')
        .set('idempotency-key', `  ${validUUID}  `);

      expect(response.status).toBe(200);
      expect(response.body.key).toBe(validUUID);
    });
  });

  describe('UUID Validation', () => {
    it('should reject invalid UUID', async () => {
      const response = await request(app.getHttpServer())
        .get('/test')
        .set('idempotency-key', 'invalid-uuid');

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        'Idempotency-Key must be a valid UUID v4',
      );
    });

    it('should accept valid UUID v4', async () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app.getHttpServer())
        .get('/test')
        .set('idempotency-key', validUUID);

      expect(response.status).toBe(200);
      expect(response.body.key).toBe(validUUID);
    });
  });
});
