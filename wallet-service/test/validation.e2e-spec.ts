import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

interface TransactionResponse {
  id: string;
  userId: string;
  amount: number;
  type: string;
  createdAt: string;
}

interface ErrorResponse {
  message: string | string[];
}

describe('Wallet Validation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  const userId = '550e8400-e29b-41d4-a716-446655440000';

  const JWT_PRIVATE_KEY = 'ILIACHALLENGE';

  const generateExternalToken = (userId: string) => {
    return jwt.sign(
      { sub: userId, email: 'test@example.com' },
      JWT_PRIVATE_KEY,
      { expiresIn: '1h' },
    );
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);

    authToken = generateExternalToken(userId);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.transaction.deleteMany();
    await prisma.wallet.deleteMany();
    await prisma.wallet.create({
      data: { user_id: userId, balance: 1000 },
    });
  });

  describe('Transaction Validation', () => {
    it('should reject amount with more than 2 decimal places', async () => {
      await request(app.getHttpServer() as import('http').Server)
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .set('idempotency-key', '660e8400-e29b-41d4-a716-446655440001')
        .send({
          amount: 100.123,
          type: 'CREDIT',
        })
        .expect(400);
    });

    it('should reject negative amount', async () => {
      await request(app.getHttpServer() as import('http').Server)
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .set('idempotency-key', '660e8400-e29b-41d4-a716-446655440002')
        .send({
          amount: -50,
          type: 'CREDIT',
        })
        .expect(400);
    });

    it('should reject zero amount', async () => {
      await request(app.getHttpServer() as import('http').Server)
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .set('idempotency-key', '660e8400-e29b-41d4-a716-446655440003')
        .send({
          amount: 0,
          type: 'CREDIT',
        })
        .expect(400);
    });

    it('should reject amount exceeding max limit', async () => {
      await request(app.getHttpServer() as import('http').Server)
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .set('idempotency-key', '660e8400-e29b-41d4-a716-446655440004')
        .send({
          amount: 1000001,
          type: 'CREDIT',
        })
        .expect(400);
    });

    it('should reject invalid transaction type', async () => {
      await request(app.getHttpServer() as import('http').Server)
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .set('idempotency-key', '660e8400-e29b-41d4-a716-446655440005')
        .send({
          amount: 100,
          type: 'INVALID_TYPE',
        })
        .expect(400);
    });

    it('should reject invalid idempotency key format in header', async () => {
      const response = await request(
        app.getHttpServer() as import('http').Server,
      )
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .set('idempotency-key', 'not-a-uuid')
        .send({
          amount: 100,
          type: 'CREDIT',
        })
        .expect(400);

      expect((response.body as ErrorResponse).message).toBe(
        'Idempotency-Key must be a valid UUID v4',
      );
    });

    it('should reject missing idempotency key header', async () => {
      const response = await request(
        app.getHttpServer() as import('http').Server,
      )
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          type: 'CREDIT',
        })
        .expect(400);

      expect((response.body as ErrorResponse).message).toBe(
        'Idempotency-Key header is required',
      );
    });

    it('should reject unknown properties in body', async () => {
      const response = await request(
        app.getHttpServer() as import('http').Server,
      )
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .set('idempotency-key', '660e8400-e29b-41d4-a716-446655440006')
        .send({
          amount: 100,
          type: 'CREDIT',
          malicious_field: 'hack',
        })
        .expect(400);

      const messageStr = JSON.stringify(
        (response.body as ErrorResponse).message,
      );
      expect(messageStr).toContain('malicious_field');
      expect(messageStr).toContain('should not exist');
    });

    it('should reject idempotency key in body (header-only)', async () => {
      const response = await request(
        app.getHttpServer() as import('http').Server,
      )
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .set('idempotency-key', '660e8400-e29b-41d4-a716-446655440007')
        .send({
          amount: 100,
          type: 'CREDIT',
          idempotencyKey: '770e8400-e29b-41d4-a716-446655440008',
        })
        .expect(400);

      const messageStr = JSON.stringify(
        (response.body as ErrorResponse).message,
      );
      expect(messageStr).toContain('idempotencyKey');
      expect(messageStr).toContain('should not exist');
    });

    it('should accept valid amount with 2 decimal places', async () => {
      const response = await request(
        app.getHttpServer() as import('http').Server,
      )
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .set('idempotency-key', '660e8400-e29b-41d4-a716-446655440009')
        .send({
          amount: 100.99,
          type: 'CREDIT',
        })
        .expect(201);

      expect((response.body as TransactionResponse).amount).toBe(100.99);
    });
  });
});
