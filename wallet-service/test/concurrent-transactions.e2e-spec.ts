import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
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

      const requests = Array.from({ length: 5 }, () =>
        request(app.getHttpServer() as import('http').Server)
          .post('/transactions')
          .set('Authorization', `Bearer ${token}`)
          .set('idempotency-key', idempotencyKey)
          .send({ amount: 100, type: 'CREDIT' }),
      );

      const responses = await Promise.all(requests);

      const successCount = responses.filter((r) => r.status === 201).length;
      expect(successCount).toBe(5);

      const conflictCount = responses.filter((r) => r.status === 409).length;
      expect(conflictCount).toBe(0);

      const transactionIds = responses.map(
        (r) => (r.body as TransactionResponse).id,
      );
      const uniqueIds = new Set(transactionIds);
      expect(uniqueIds.size).toBe(1);

      const wallet = await prisma.wallet.findUnique({
        where: { user_id: testUserId },
      });
      expect(Number(wallet!.balance)).toBe(1100);

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

      const requests = Array.from({ length: 10 }, () =>
        request(app.getHttpServer() as import('http').Server)
          .post('/transactions')
          .set('Authorization', `Bearer ${token}`)
          .set('idempotency-key', randomUUID())
          .send({ amount: 50, type: 'CREDIT' }),
      );

      const responses = await Promise.all(requests);

      const unexpected = responses
        .filter((r) => r.status !== 201)
        .map((r) => ({
          status: r.status,
          body: r.body as TransactionResponse,
        }));

      expect(unexpected).toEqual([]);

      const wallet = await prisma.wallet.findUnique({
        where: { user_id: testUserId },
      });
      expect(Number(wallet!.balance)).toBe(1500);

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

      const requests = Array.from({ length: 3 }, () =>
        request(app.getHttpServer() as import('http').Server)
          .post('/transactions')
          .set('Authorization', `Bearer ${token}`)
          .set('idempotency-key', idempotencyKey)
          .send({ amount: 100, type: 'DEBIT' }),
      );

      const responses = await Promise.all(requests);

      const successCount = responses.filter((r) => r.status === 201).length;
      expect(successCount).toBe(3);

      const conflictCount = responses.filter((r) => r.status === 409).length;
      expect(conflictCount).toBe(0);

      const transactionIds = responses.map(
        (r) => (r.body as TransactionResponse).id,
      );
      const uniqueIds = new Set(transactionIds);
      expect(uniqueIds.size).toBe(1);

      const wallet = await prisma.wallet.findUnique({
        where: { user_id: testUserId },
      });
      expect(Number(wallet!.balance)).toBe(0);

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

      const requests = [
        ...Array.from({ length: 25 }, () =>
          request(app.getHttpServer() as import('http').Server)
            .post('/transactions')
            .set('Authorization', `Bearer ${token}`)
            .set('idempotency-key', randomUUID())
            .send({ amount: 10, type: 'CREDIT' }),
        ),
        ...Array.from({ length: 25 }, () =>
          request(app.getHttpServer() as import('http').Server)
            .post('/transactions')
            .set('Authorization', `Bearer ${token}`)
            .set('idempotency-key', randomUUID())
            .send({ amount: 10, type: 'DEBIT' }),
        ),
      ];

      const responses = await Promise.all(requests);

      const unexpected = responses
        .filter((r) => r.status !== 201)
        .map((r) => ({
          status: r.status,
          body: r.body as TransactionResponse,
        }));

      expect(unexpected).toEqual([]);

      const wallet = await prisma.wallet.findUnique({
        where: { user_id: testUserId },
      });
      expect(Number(wallet!.balance)).toBe(10000);

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

      const firstResponse = await request(
        app.getHttpServer() as import('http').Server,
      )
        .post('/transactions')
        .set('Authorization', `Bearer ${token}`)
        .set('idempotency-key', idempotencyKey)
        .send({ amount: 100, type: 'CREDIT' })
        .expect(201);

      const firstTransactionId = (firstResponse.body as TransactionResponse).id;

      await new Promise((resolve) => setTimeout(resolve, 100));

      const secondResponse = await request(
        app.getHttpServer() as import('http').Server,
      )
        .post('/transactions')
        .set('Authorization', `Bearer ${token}`)
        .set('idempotency-key', idempotencyKey)
        .send({ amount: 100, type: 'CREDIT' })
        .expect(201);

      const secondBody = secondResponse.body as TransactionResponse;
      expect(secondBody.id).toBe(firstTransactionId);
      expect(secondBody.amount).toBe(100);
      expect(secondBody.type).toBe('CREDIT');

      const wallet = await prisma.wallet.findUnique({
        where: { user_id: testUserId },
      });
      expect(Number(wallet!.balance)).toBe(1100);

      const transactions = await prisma.transaction.findMany({
        where: { user_id: testUserId },
      });
      expect(transactions.length).toBe(1);
    });
  });

  describe('Race Condition Prevention', () => {
    it('should prevent double-spend with concurrent debits using different idempotency keys', async () => {
      await prisma.wallet.create({
        data: { user_id: testUserId, balance: 100 },
      });

      const token = generateToken(testUserId);

      const requests = Array.from({ length: 3 }, () =>
        request(app.getHttpServer() as import('http').Server)
          .post('/transactions')
          .set('Authorization', `Bearer ${token}`)
          .set('idempotency-key', randomUUID())
          .send({ amount: 80, type: 'DEBIT' }),
      );

      const responses = await Promise.all(requests);

      const successCount = responses.filter((r) => r.status === 201).length;
      const failCount = responses.filter((r) => r.status === 400).length;

      expect(successCount).toBeGreaterThanOrEqual(1);
      expect(failCount).toBeGreaterThanOrEqual(1);
      expect(successCount + failCount).toBe(3);
      expect(responses.every((r) => [201, 400].includes(r.status))).toBe(true);

      const wallet = await prisma.wallet.findUnique({
        where: { user_id: testUserId },
      });
      expect(Number(wallet!.balance)).toBe(100 - successCount * 80);

      const debitTransactions = await prisma.transaction.findMany({
        where: { user_id: testUserId, type: 'DEBIT' },
      });
      expect(debitTransactions.length).toBe(successCount);
    });
  });
});
