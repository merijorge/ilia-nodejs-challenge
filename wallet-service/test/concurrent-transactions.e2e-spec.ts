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
    it('should return same transaction for concurrent duplicate requests', async () => {
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

      const responses = await Promise.all(requests);

      // All should return 201 (true idempotency)
      const successCount = responses.filter((r) => r.status === 201).length;
      expect(successCount).toBe(5);

      // No conflicts should occur
      const conflictCount = responses.filter((r) => r.status === 409).length;
      expect(conflictCount).toBe(0);

      // All should return the SAME transaction ID
      const transactionIds = responses.map((r) => r.body.id);
      const uniqueIds = new Set(transactionIds);
      expect(uniqueIds.size).toBe(1);

      // Verify balance updated only once
      const wallet = await prisma.wallet.findUnique({
        where: { user_id: testUserId },
      });
      expect(Number(wallet!.balance)).toBe(1100);

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
      const requests = Array.from({ length: 10 }, () =>
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
      expect(Number(wallet!.balance)).toBe(1500);

      // Verify 10 transactions created
      const transactions = await prisma.transaction.findMany({
        where: { user_id: testUserId },
      });
      expect(transactions.length).toBe(10);
    });

    it('should return same transaction for concurrent debit with insufficient funds', async () => {
      await prisma.wallet.create({
        data: { user_id: testUserId, balance: 100 },
      });

      const token = generateToken(testUserId);
      const idempotencyKey = randomUUID();

      // Send 3 concurrent DEBIT requests for 100 each
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

      const responses = await Promise.all(requests);

      // All should return 201 (idempotent)
      const successCount = responses.filter((r) => r.status === 201).length;
      expect(successCount).toBe(3);

      // No conflicts
      const conflictCount = responses.filter((r) => r.status === 409).length;
      expect(conflictCount).toBe(0);

      // Verify they all returned the SAME transaction
      const transactionIds = responses.map((r) => r.body.id);
      const uniqueIds = new Set(transactionIds);
      expect(uniqueIds.size).toBe(1);

      // Verify balance decreased only once
      const wallet = await prisma.wallet.findUnique({
        where: { user_id: testUserId },
      });
      expect(Number(wallet!.balance)).toBe(0);

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
        ...Array.from({ length: 25 }, () =>
          request(app.getHttpServer())
            .post('/transactions')
            .set('Authorization', `Bearer ${token}`)
            .send({
              amount: 10,
              type: 'CREDIT',
              idempotencyKey: randomUUID(),
            }),
        ),
        ...Array.from({ length: 25 }, () =>
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
      expect(Number(wallet!.balance)).toBe(10000);

      // Verify 50 transactions created
      const transactions = await prisma.transaction.findMany({
        where: { user_id: testUserId },
      });
      expect(transactions.length).toBe(50);
    });

    it('should return existing transaction for sequential duplicate request', async () => {
      await prisma.wallet.create({
        data: { user_id: testUserId, balance: 1000 },
      });

      const token = generateToken(testUserId);
      const idempotencyKey = randomUUID();

      // First request
      const firstResponse = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 100,
          type: 'CREDIT',
          idempotencyKey,
        })
        .expect(201);

      const firstTransactionId = firstResponse.body.id;

      // Wait a bit to ensure non-concurrent
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second request with same key (non-concurrent duplicate)
      const secondResponse = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 100,
          type: 'CREDIT',
          idempotencyKey,
        })
        .expect(201);

      // Should return the SAME transaction
      expect(secondResponse.body.id).toBe(firstTransactionId);
      expect(secondResponse.body.amount).toBe(100);
      expect(secondResponse.body.type).toBe('CREDIT');

      // Verify balance updated only once
      const wallet = await prisma.wallet.findUnique({
        where: { user_id: testUserId },
      });
      expect(Number(wallet!.balance)).toBe(1100); // 1000 + 100 (not 1200)

      // Verify only one transaction exists
      const transactions = await prisma.transaction.findMany({
        where: { user_id: testUserId },
      });
      expect(transactions.length).toBe(1);
    });
  });
});
