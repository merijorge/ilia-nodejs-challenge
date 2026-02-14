import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
const request = require('supertest');

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
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100.123,
          type: 'CREDIT',
          idempotencyKey: '660e8400-e29b-41d4-a716-446655440001',
        })
        .expect(400);
    });

    it('should reject negative amount', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: -50,
          type: 'CREDIT',
          idempotencyKey: '660e8400-e29b-41d4-a716-446655440002',
        })
        .expect(400);
    });

    it('should reject zero amount', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 0,
          type: 'CREDIT',
          idempotencyKey: '660e8400-e29b-41d4-a716-446655440003',
        })
        .expect(400);
    });

    it('should reject amount exceeding max limit', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 1000001,
          type: 'CREDIT',
          idempotencyKey: '660e8400-e29b-41d4-a716-446655440004',
        })
        .expect(400);
    });

    it('should reject invalid transaction type', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          type: 'INVALID_TYPE',
          idempotencyKey: '660e8400-e29b-41d4-a716-446655440005',
        })
        .expect(400);
    });

    it('should reject invalid idempotency key format', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          type: 'CREDIT',
          idempotencyKey: 'not-a-uuid',
        })
        .expect(400);
    });

    it('should reject unknown properties', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          type: 'CREDIT',
          idempotencyKey: '660e8400-e29b-41d4-a716-446655440006',
          malicious_field: 'hack',
        })
        .expect(400);
    });

    it('should accept valid amount with 2 decimal places', async () => {
      const response = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100.99,
          type: 'CREDIT',
          idempotencyKey: '660e8400-e29b-41d4-a716-446655440007',
        })
        .expect(201);

      expect(response.body.amount).toBe(100.99);
    });
  });
});
