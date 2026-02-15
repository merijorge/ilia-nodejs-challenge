import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
const request = require('supertest');

describe('Concurrent Transaction Tests (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testUserId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
  const JWT_PRIVATE_KEY = 'ILIACHALLENGE';

  const generateToken = (userId: string): string => {
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
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany({ where: { user_id: testUserId } });
    await prisma.wallet.deleteMany({ where: { user_id: testUserId } });
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.transaction.deleteMany({ where: { user_id: testUserId } });
    await prisma.wallet.deleteMany({ where: { user_id: testUserId } });
  });

  describe('Concurrent Duplicate Transactions', () => {
    it('should reject concurrent requests with same idempotency key', async () => {
      // Setup: Create wallet
      await prisma.wallet.create({
        data: { user_id: testUserId, balance: 1000 },
      });

      const token = generateToken(testUserId);
      const idempotencyKey = randomUUID();

      // Send 5 identical concurrent requests
      const requests = Array.from({ length: 5 }, () =>
        request(app.getHttpServer())
          .post('/transactions')
          .set('Authorization', `Bearer ${token}`)
          .send({
            amount: 100,
            type: 'CREDIT',
            idempotencyKey,
          }),
      );

      const responses = await Promise.allSettled(requests);

      // Count successful vs failed
      const successful = responses.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 201,
      );
      const conflicts = responses.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 409,
      );

      // Exactly ONE should succeed
      expect(successful.length).toBe(1);

      // The rest should be conflicts
      expect(conflicts.length).toBe(4);

      // Verify balance updated only once
      const wallet = await prisma.wallet.findUnique({
        where: { user_id: testUserId },
      });
      expect(wallet).toBeDefined();
      expect(Number(wallet!.balance)).toBe(1100); // 1000 + 100 (only once)

      // Verify only one transaction created
      const transactions = await prisma.transaction.findMany({
        where: { user_id: testUserId },
      });
      expect(transactions.length).toBe(1);
    });

    it('should handle concurrent transactions with different idempotency keys', async () => {
      await prisma.wallet.create({
        data: { user_id: testUserId, balance: 1000 },
      });

      const token = generateToken(testUserId);

      // Send 10 concurrent requests with different keys
      const requests = Array.from({ length: 10 }, (_, i) =>
        request(app.getHttpServer())
          .post('/transactions')
          .set('Authorization', `Bearer ${token}`)
          .send({
            amount: 50,
            type: 'CREDIT',
            idempotencyKey: randomUUID(),
          }),
      );

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(201);
      });

      // Verify balance updated 10 times
      const wallet = await prisma.wallet.findUnique({
        where: { user_id: testUserId },
      });
      expect(wallet).toBeDefined();
      expect(Number(wallet!.balance)).toBe(1500); // 1000 + (50 * 10)

      // Verify 10 transactions created
      const transactions = await prisma.transaction.findMany({
        where: { user_id: testUserId },
      });
      expect(transactions.length).toBe(10);
    });

    it('should handle race condition with insufficient funds check', async () => {
      await prisma.wallet.create({
        data: { user_id: testUserId, balance: 100 },
      });

      const token = generateToken(testUserId);
      const idempotencyKey = randomUUID();

      // Send 3 concurrent DEBIT requests for 100 each (only first should succeed)
      const requests = Array.from({ length: 3 }, () =>
        request(app.getHttpServer())
          .post('/transactions')
          .set('Authorization', `Bearer ${token}`)
          .send({
            amount: 100,
            type: 'DEBIT',
            idempotencyKey,
          }),
      );

      const responses = await Promise.allSettled(requests);

      // Exactly one should succeed
      const successful = responses.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 201,
      );
      expect(successful.length).toBe(1);

      // Others should be conflicts (duplicate idempotency key)
      const conflicts = responses.filter(
        (r) => r.status === 'fulfilled' && r.value.status === 409,
      );
      expect(conflicts.length).toBe(2);

      // Verify balance decreased only once
      const wallet = await prisma.wallet.findUnique({
        where: { user_id: testUserId },
      });
      expect(wallet).toBeDefined();
      expect(Number(wallet!.balance)).toBe(0); // 100 - 100

      // Verify only one transaction created
      const transactions = await prisma.transaction.findMany({
        where: { user_id: testUserId },
      });
      expect(transactions.length).toBe(1);
    });

    it('should maintain balance consistency under heavy concurrent load', async () => {
      await prisma.wallet.create({
        data: { user_id: testUserId, balance: 10000 },
      });

      const token = generateToken(testUserId);

      // 50 concurrent transactions: 25 credits + 25 debits
      const requests = [
        ...Array.from({ length: 25 }, (_, i) =>
          request(app.getHttpServer())
            .post('/transactions')
            .set('Authorization', `Bearer ${token}`)
            .send({
              amount: 10,
              type: 'CREDIT',
              idempotencyKey: randomUUID(),
            }),
        ),
        ...Array.from({ length: 25 }, (_, i) =>
          request(app.getHttpServer())
            .post('/transactions')
            .set('Authorization', `Bearer ${token}`)
            .send({
              amount: 10,
              type: 'DEBIT',
              idempotencyKey: randomUUID(),
            }),
        ),
      ];

      const responses = await Promise.all(requests);

      // All should succeed (different keys)
      responses.forEach((response) => {
        expect(response.status).toBe(201);
      });

      // Verify final balance
      const wallet = await prisma.wallet.findUnique({
        where: { user_id: testUserId },
      });

      // 10000 + (25 × 10) - (25 × 10) = 10000
      expect(wallet).toBeDefined();
      expect(Number(wallet!.balance)).toBe(10000);

      // Verify 50 transactions created
      const transactions = await prisma.transaction.findMany({
        where: { user_id: testUserId },
      });
      expect(transactions.length).toBe(50);
    });
  });
});
