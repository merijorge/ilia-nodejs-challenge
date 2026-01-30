import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Wallet Service E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test user data
  const testUserId = 999;

  // JWT secrets from env
  const JWT_PRIVATE_KEY = 'ILIACHALLENGE';
  const JWT_INTERNAL_KEY = 'ILIACHALLENGE_INTERNAL';

  // Generate external JWT (for user endpoints)
  const generateExternalToken = (userId: number) => {
    return jwt.sign(
      { sub: userId, email: 'test@example.com' },
      JWT_PRIVATE_KEY,
      { expiresIn: '1h' },
    );
  };

  // Generate internal JWT (for service-to-service endpoints)
  const generateInternalToken = (userId: number) => {
    return jwt.sign({ userId }, JWT_INTERNAL_KEY, { expiresIn: '5m' });
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same validation as main.ts
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
    // Cleanup test data
    await prisma.transaction.deleteMany({ where: { user_id: testUserId } });
    await prisma.wallet.deleteMany({ where: { user_id: testUserId } });
    await app.close();
  });

  beforeEach(async () => {
    // Clean slate for each test
    await prisma.transaction.deleteMany({ where: { user_id: testUserId } });
    await prisma.wallet.deleteMany({ where: { user_id: testUserId } });
  });

  describe('POST /wallet/internal/create (Internal)', () => {
    it('should create wallet with internal JWT', async () => {
      const internalToken = generateInternalToken(testUserId);

      const response = await request(app.getHttpServer())
        .post('/wallet/internal/create')
        .set('Authorization', `Bearer ${internalToken}`)
        .send({ userId: testUserId })
        .expect(201);

      expect(response.body).toMatchObject({
        userId: testUserId,
        balance: 0,
      });
      expect(response.body.createdAt).toBeDefined();
    });

    it('should reject wallet creation with external JWT', async () => {
      const externalToken = generateExternalToken(testUserId);

      await request(app.getHttpServer())
        .post('/wallet/internal/create')
        .set('Authorization', `Bearer ${externalToken}`)
        .send({ userId: testUserId })
        .expect(401); // Unauthorized - wrong JWT type
    });

    it('should reject duplicate wallet creation', async () => {
      const internalToken = generateInternalToken(testUserId);

      // Create first wallet
      await request(app.getHttpServer())
        .post('/wallet/internal/create')
        .set('Authorization', `Bearer ${internalToken}`)
        .send({ userId: testUserId })
        .expect(201);

      // Try to create again
      await request(app.getHttpServer())
        .post('/wallet/internal/create')
        .set('Authorization', `Bearer ${internalToken}`)
        .send({ userId: testUserId })
        .expect(409); // Conflict
    });

    it('should reject invalid userId', async () => {
      const internalToken = generateInternalToken(testUserId);

      await request(app.getHttpServer())
        .post('/wallet/internal/create')
        .set('Authorization', `Bearer ${internalToken}`)
        .send({ userId: -1 }) // Negative ID
        .expect(400); // Bad Request - validation failed
    });
  });

  describe('GET /wallet/balance (External)', () => {
    beforeEach(async () => {
      // Create wallet for balance tests
      await prisma.wallet.create({
        data: { user_id: testUserId, balance: 100 },
      });
    });

    it('should get balance with external JWT', async () => {
      const externalToken = generateExternalToken(testUserId);

      const response = await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('Authorization', `Bearer ${externalToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        userId: testUserId,
        balance: 100,
      });
    });

    it('should reject balance query without JWT', async () => {
      await request(app.getHttpServer()).get('/wallet/balance').expect(401); // Unauthorized
    });

    it('should return 404 if wallet does not exist', async () => {
      const differentUserId = 888;
      const externalToken = generateExternalToken(differentUserId);

      await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('Authorization', `Bearer ${externalToken}`)
        .expect(404); // Not Found
    });
  });

  describe('POST /transactions (External)', () => {
    beforeEach(async () => {
      // Create wallet with initial balance
      await prisma.wallet.create({
        data: { user_id: testUserId, balance: 100 },
      });
    });

    it('should create CREDIT transaction', async () => {
      const externalToken = generateExternalToken(testUserId);

      const response = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${externalToken}`)
        .send({
          amount: 50,
          type: 'CREDIT',
          idempotencyKey: 'credit-test-001',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        userId: testUserId,
        amount: 50,
        type: 'CREDIT',
      });
      expect(response.body.id).toBeDefined();

      // Verify balance increased
      const wallet = await prisma.wallet.findUnique({
        where: { user_id: testUserId },
      });
      expect(wallet).toBeDefined();
      expect(Number(wallet!.balance)).toBe(150);
    });

    it('should create DEBIT transaction', async () => {
      const externalToken = generateExternalToken(testUserId);

      const response = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${externalToken}`)
        .send({
          amount: 30,
          type: 'DEBIT',
          idempotencyKey: 'debit-test-001',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        userId: testUserId,
        amount: 30,
        type: 'DEBIT',
      });

      // Verify balance decreased
      const wallet = await prisma.wallet.findUnique({
        where: { user_id: testUserId },
      });
      expect(wallet).toBeDefined();
      expect(Number(wallet!.balance)).toBe(70);
    });

    it('should reject DEBIT with insufficient funds', async () => {
      const externalToken = generateExternalToken(testUserId);

      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${externalToken}`)
        .send({
          amount: 200, // Balance is only 100
          type: 'DEBIT',
          idempotencyKey: 'debit-fail-001',
        })
        .expect(400); // Bad Request

      // Verify balance unchanged
      const wallet = await prisma.wallet.findUnique({
        where: { user_id: testUserId },
      });
      expect(wallet).toBeDefined();
      expect(Number(wallet!.balance)).toBe(100);
    });

    it('should reject duplicate idempotency key', async () => {
      const externalToken = generateExternalToken(testUserId);
      const idempotencyKey = 'duplicate-test-001';

      // First transaction
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${externalToken}`)
        .send({
          amount: 10,
          type: 'CREDIT',
          idempotencyKey,
        })
        .expect(201);

      // Second transaction with same key
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${externalToken}`)
        .send({
          amount: 10,
          type: 'CREDIT',
          idempotencyKey, // Same key!
        })
        .expect(409); // Conflict

      // Verify balance only increased once
      const wallet = await prisma.wallet.findUnique({
        where: { user_id: testUserId },
      });
      expect(wallet).toBeDefined();
      expect(Number(wallet!.balance)).toBe(110); // Not 120
    });

    it('should reject transaction without idempotency key', async () => {
      const externalToken = generateExternalToken(testUserId);

      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${externalToken}`)
        .send({
          amount: 50,
          type: 'CREDIT',
          // Missing idempotencyKey
        })
        .expect(400); // Bad Request - validation failed
    });

    it('should reject negative amounts', async () => {
      const externalToken = generateExternalToken(testUserId);

      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${externalToken}`)
        .send({
          amount: -50,
          type: 'CREDIT',
          idempotencyKey: 'negative-test-001',
        })
        .expect(400); // Bad Request
    });

    it('should accept idempotency key from header', async () => {
      const externalToken = generateExternalToken(testUserId);

      const response = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${externalToken}`)
        .set('Idempotency-Key', 'header-test-001')
        .send({
          amount: 25,
          type: 'CREDIT',
          idempotencyKey: 'body-key', // Body key should be overridden
        })
        .expect(201);

      // Verify the header key was used
      const transaction = await prisma.transaction.findUnique({
        where: { idempotency_key: 'header-test-001' },
      });
      expect(transaction).toBeDefined();
    });
  });

  describe('GET /transactions (External)', () => {
    beforeEach(async () => {
      // Create wallet and transactions
      await prisma.wallet.create({
        data: { user_id: testUserId, balance: 100 },
      });

      await prisma.transaction.createMany({
        data: [
          {
            user_id: testUserId,
            amount: 50,
            type: 'CREDIT',
            idempotency_key: 'history-001',
          },
          {
            user_id: testUserId,
            amount: 30,
            type: 'DEBIT',
            idempotency_key: 'history-002',
          },
        ],
      });
    });

    it('should list user transactions', async () => {
      const externalToken = generateExternalToken(testUserId);

      const response = await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', `Bearer ${externalToken}`)
        .expect(200);

      expect(response.body).toHaveLength(2);

      // Verify both transactions exist (order may vary due to same timestamp)
      const types = response.body.map((t) => t.type);
      expect(types).toContain('CREDIT');
      expect(types).toContain('DEBIT');

      // Verify all transactions belong to the user
      response.body.forEach((transaction) => {
        expect(transaction.userId).toBe(testUserId);
        expect(transaction.id).toBeDefined();
        expect(transaction.amount).toBeDefined();
        expect(transaction.createdAt).toBeDefined();
      });
    });

    it('should only show current user transactions', async () => {
      // Create transaction for different user
      await prisma.wallet.create({
        data: { user_id: 777, balance: 50 },
      });
      await prisma.transaction.create({
        data: {
          user_id: 777,
          amount: 10,
          type: 'CREDIT',
          idempotency_key: 'other-user-001',
        },
      });

      const externalToken = generateExternalToken(testUserId);

      const response = await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', `Bearer ${externalToken}`)
        .expect(200);

      // Should only see testUserId transactions
      expect(response.body).toHaveLength(2);
      expect(response.body.every((t) => t.userId === testUserId)).toBe(true);

      // Cleanup
      await prisma.transaction.deleteMany({ where: { user_id: 777 } });
      await prisma.wallet.deleteMany({ where: { user_id: 777 } });
    });
  });
});
