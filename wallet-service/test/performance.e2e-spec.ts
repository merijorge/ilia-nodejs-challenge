import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
const request = require('supertest');

describe('Balance Performance (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const userId1 = '550e8400-e29b-41d4-a716-446655440000';
  const userId2 = '550e8400-e29b-41d4-a716-446655440001';
  const userId3 = '550e8400-e29b-41d4-a716-446655440002';
  const userId4 = '550e8400-e29b-41d4-a716-446655440003';
  // Uncomment for extreme scale testing (adds ~100s to test time)
  // const userId5 = '550e8400-e29b-41d4-a716-446655440004'; // 100,000 tx
  // const userId6 = '550e8400-e29b-41d4-a716-446655440005'; // 1,000,000 tx

  const generateToken = (userId: string, email: string): string => {
    return jwt.sign(
      { sub: userId, email: email },
      process.env.JWT_PRIVATE_KEY || 'ILIACHALLENGE',
      { expiresIn: '1h' },
    );
  };

  const createBulkTransactions = async (
    userId: string,
    count: number,
    batchSize: number = 1000,
  ) => {
    const startTime = Date.now();

    for (let i = 0; i < count; i += batchSize) {
      const batch = Math.min(batchSize, count - i);
      const transactions = Array.from({ length: batch }, () => ({
        user_id: userId,
        amount: 10,
        type: 'CREDIT' as const,
        idempotency_key: randomUUID(),
      }));

      await prisma.transaction.createMany({ data: transactions });
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    process.stdout.write(
      `  ${count.toLocaleString('en-US')} transactions: ${elapsed}s\n`,
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
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.transaction.deleteMany();
    await prisma.wallet.deleteMany();
  });

  describe('O(1) Balance Lookup Performance', () => {
    it('should retrieve balance in O(1) time regardless of transaction count', async () => {
      process.stdout.write('\n=== TEST 1: Balance Lookup Performance ===\n\n');

      // Create wallets
      await prisma.wallet.create({ data: { user_id: userId1, balance: 100 } });
      await prisma.wallet.create({ data: { user_id: userId2, balance: 100 } });
      await prisma.wallet.create({ data: { user_id: userId3, balance: 100 } });
      await prisma.wallet.create({ data: { user_id: userId4, balance: 100 } });
      // Uncomment for extreme scale:
      // await prisma.wallet.create({ data: { user_id: userId5, balance: 100 } });
      // await prisma.wallet.create({ data: { user_id: userId6, balance: 100 } });

      // Create transactions at different scales
      process.stdout.write(
        'Setup: Creating wallets with varying transaction histories\n',
      );
      await createBulkTransactions(userId1, 10);
      await createBulkTransactions(userId2, 100);
      await createBulkTransactions(userId3, 1000);
      await createBulkTransactions(userId4, 10000);
      // Uncomment for extreme scale (adds ~100s):
      // await createBulkTransactions(userId5, 100000);
      // await createBulkTransactions(userId6, 1000000);

      // Generate tokens
      const token1 = generateToken(userId1, 'user1@example.com');
      const token2 = generateToken(userId2, 'user2@example.com');
      const token3 = generateToken(userId3, 'user3@example.com');
      const token4 = generateToken(userId4, 'user4@example.com');
      // const token5 = generateToken(userId5, 'user5@example.com');
      // const token6 = generateToken(userId6, 'user6@example.com');

      // Measure balance retrieval times
      process.stdout.write(
        '\nTest: Measuring balance lookup time for each wallet\n',
      );

      const start1 = Date.now();
      await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);
      const time2 = Date.now() - start2;

      const start3 = Date.now();
      await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('Authorization', `Bearer ${token3}`)
        .expect(200);
      const time3 = Date.now() - start3;

      const start4 = Date.now();
      await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('Authorization', `Bearer ${token4}`)
        .expect(200);
      const time4 = Date.now() - start4;

      // Uncomment for extreme scale:
      // const start5 = Date.now();
      // await request(app.getHttpServer())
      //   .get('/wallet/balance')
      //   .set('Authorization', `Bearer ${token5}`)
      //   .expect(200);
      // const time5 = Date.now() - start5;

      // const start6 = Date.now();
      // await request(app.getHttpServer())
      //   .get('/wallet/balance')
      //   .set('Authorization', `Bearer ${token6}`)
      //   .expect(200);
      // const time6 = Date.now() - start6;

      process.stdout.write(`  Wallet with 10 transactions: ${time1}ms\n`);
      process.stdout.write(`  Wallet with 100 transactions: ${time2}ms\n`);
      process.stdout.write(`  Wallet with 1,000 transactions: ${time3}ms\n`);
      process.stdout.write(`  Wallet with 10,000 transactions: ${time4}ms\n`);
      // process.stdout.write(`  Wallet with 100,000 transactions: ${time5}ms\n`);
      // process.stdout.write(`  Wallet with 1,000,000 transactions: ${time6}ms\n`);

      const times = [time1, time2, time3, time4]; // Add time5, time6 for extreme scale
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const variance = maxTime - minTime;

      process.stdout.write('\nResults:\n');
      process.stdout.write(
        `  Min: ${minTime}ms | Max: ${maxTime}ms | Avg: ${avgTime.toFixed(1)}ms\n`,
      );
      process.stdout.write(`  Variance: ${variance}ms (threshold: <100ms)\n`);
      process.stdout.write(
        `  ${variance < 100 && maxTime < 200 ? '✓ PASS - Balance lookup is O(1)' : '✗ FAIL'}\n\n`,
      );

      // Assertions
      expect(variance).toBeLessThan(100);
      expect(maxTime).toBeLessThan(200);
      expect(avgTime).toBeLessThan(50);
    }, 60000);

    it('should verify balance integrity correctly', async () => {
      await prisma.wallet.create({
        data: { user_id: userId1, balance: 0 },
      });

      // Create 50 transactions with alternating credit/debit
      for (let i = 0; i < 50; i++) {
        const amount = i % 2 === 0 ? 10 : 5;
        const type = i % 2 === 0 ? 'CREDIT' : 'DEBIT';

        await prisma.transaction.create({
          data: {
            user_id: userId1,
            amount: amount,
            type: type,
            idempotency_key: randomUUID(),
          },
        });

        await prisma.wallet.update({
          where: { user_id: userId1 },
          data: {
            balance: {
              [type === 'CREDIT' ? 'increment' : 'decrement']: amount,
            },
          },
        });
      }

      const token = generateToken(userId1, 'user@example.com');

      const response = await request(app.getHttpServer())
        .get('/wallet/verify')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.isConsistent).toBe(true);
      expect(response.body.transactionCount).toBe(50);
      expect(response.body.discrepancy).toBeLessThan(0.01);
    });

    it('should detect balance inconsistencies', async () => {
      await prisma.wallet.create({
        data: { user_id: userId1, balance: 0 },
      });

      await prisma.transaction.create({
        data: {
          user_id: userId1,
          amount: 100,
          type: 'CREDIT',
          idempotency_key: randomUUID(),
        },
      });
      await prisma.transaction.create({
        data: {
          user_id: userId1,
          amount: 50,
          type: 'CREDIT',
          idempotency_key: randomUUID(),
        },
      });

      await prisma.wallet.update({
        where: { user_id: userId1 },
        data: { balance: 999 },
      });

      const token = generateToken(userId1, 'user@example.com');

      const verifyResponse = await request(app.getHttpServer())
        .get('/wallet/verify')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(verifyResponse.body.isConsistent).toBe(false);
      expect(verifyResponse.body.storedBalance).toBe(999);
      expect(verifyResponse.body.calculatedBalance).toBe(150);
      expect(verifyResponse.body.discrepancy).toBe(849);
    });
  });

  describe('Transaction Creation Performance', () => {
    it('should create transactions in O(1) time', async () => {
      process.stdout.write(
        '\n=== TEST 2: Sequential Transaction Creation ===\n\n',
      );

      await prisma.wallet.create({
        data: { user_id: userId1, balance: 10000 },
      });

      const token = generateToken(userId1, 'user@example.com');
      const times: number[] = [];

      process.stdout.write(
        'Test: Creating 100 transactions sequentially on same wallet\n',
      );

      for (let i = 0; i < 100; i++) {
        const start = Date.now();

        await request(app.getHttpServer())
          .post('/transactions')
          .set('Authorization', `Bearer ${token}`)
          .send({
            amount: 10,
            type: 'DEBIT',
            idempotencyKey: randomUUID(),
          })
          .expect(201);

        times.push(Date.now() - start);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const firstTenAvg = times.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
      const lastTenAvg = times.slice(-10).reduce((a, b) => a + b, 0) / 10;

      process.stdout.write('\nResults:\n');
      process.stdout.write(
        `  Average time: ${avgTime.toFixed(1)}ms | Max: ${maxTime}ms\n`,
      );
      process.stdout.write(
        `  First 10 avg: ${firstTenAvg.toFixed(1)}ms | Last 10 avg: ${lastTenAvg.toFixed(1)}ms\n`,
      );
      process.stdout.write(
        `  ${Math.abs(firstTenAvg - lastTenAvg) < 50 ? '✓ PASS - No performance degradation' : '✗ FAIL'}\n\n`,
      );

      expect(avgTime).toBeLessThan(100);
      expect(maxTime).toBeLessThan(500);
    });

    it('should create transactions in O(1) time regardless of existing transaction count', async () => {
      process.stdout.write(
        '\n=== TEST 3: Transaction Creation with Varying History ===\n\n',
      );

      // Setup: Create wallets with different transaction histories
      process.stdout.write(
        'Setup: Creating wallets with varying transaction histories\n',
      );

      await prisma.wallet.create({
        data: { user_id: userId1, balance: 10000 },
      });
      await prisma.wallet.create({
        data: { user_id: userId2, balance: 10000 },
      });
      await prisma.wallet.create({
        data: { user_id: userId3, balance: 10000 },
      });
      await prisma.wallet.create({
        data: { user_id: userId4, balance: 10000 },
      });

      // Create existing transaction history
      await createBulkTransactions(userId1, 10);
      await createBulkTransactions(userId2, 1000);
      await createBulkTransactions(userId3, 10000);
      // userId4 stays at 0 transactions (baseline)

      process.stdout.write(
        '\nTest: Creating 1 new transaction on each wallet\n',
      );

      const token1 = generateToken(userId1, 'user1@example.com');
      const token2 = generateToken(userId2, 'user2@example.com');
      const token3 = generateToken(userId3, 'user3@example.com');
      const token4 = generateToken(userId4, 'user4@example.com');

      // Baseline: Wallet with 0 existing transactions
      const start4 = Date.now();
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${token4}`)
        .send({
          amount: 10,
          type: 'DEBIT',
          idempotencyKey: randomUUID(),
        })
        .expect(201);
      const time4 = Date.now() - start4;

      // Wallet with 10 existing transactions
      const start1 = Date.now();
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          amount: 10,
          type: 'DEBIT',
          idempotencyKey: randomUUID(),
        })
        .expect(201);
      const time1 = Date.now() - start1;

      // Wallet with 1,000 existing transactions
      const start2 = Date.now();
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          amount: 10,
          type: 'DEBIT',
          idempotencyKey: randomUUID(),
        })
        .expect(201);
      const time2 = Date.now() - start2;

      // Wallet with 10,000 existing transactions
      const start3 = Date.now();
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${token3}`)
        .send({
          amount: 10,
          type: 'DEBIT',
          idempotencyKey: randomUUID(),
        })
        .expect(201);
      const time3 = Date.now() - start3;

      process.stdout.write(
        `  Wallet with 0 existing transactions: ${time4}ms\n`,
      );
      process.stdout.write(
        `  Wallet with 10 existing transactions: ${time1}ms\n`,
      );
      process.stdout.write(
        `  Wallet with 1,000 existing transactions: ${time2}ms\n`,
      );
      process.stdout.write(
        `  Wallet with 10,000 existing transactions: ${time3}ms\n`,
      );

      const times = [time1, time2, time3, time4];
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const variance = maxTime - minTime;

      process.stdout.write('\nResults:\n');
      process.stdout.write(
        `  Min: ${minTime}ms | Max: ${maxTime}ms | Avg: ${avgTime.toFixed(1)}ms\n`,
      );
      process.stdout.write(`  Variance: ${variance}ms (threshold: <100ms)\n`);
      process.stdout.write(
        `  ${variance < 100 && maxTime < 200 ? '✓ PASS - Transaction creation is O(1)' : '✗ FAIL'}\n\n`,
      );

      // Assertions
      expect(variance).toBeLessThan(100);
      expect(maxTime).toBeLessThan(200);
      expect(avgTime).toBeLessThan(100);
    }, 60000);
  });
});
