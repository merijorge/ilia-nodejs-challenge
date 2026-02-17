import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Wallet Service E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testUserId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

  // JWT secrets from env
  const JWT_PRIVATE_KEY = 'ILIACHALLENGE';
  const JWT_INTERNAL_KEY = 'ILIACHALLENGE_INTERNAL';

  // Generate external JWT (for user endpoints)
  const generateExternalToken = (userId: string) => {
    return jwt.sign(
      { sub: userId, email: 'test@example.com' },
      JWT_PRIVATE_KEY,
      { expiresIn: '1h' },
    );
  };

  // Generate internal JWT (for service-to-service endpoints)
  const generateInternalToken = () => {
    return jwt.sign({ service: 'user-service' }, JWT_INTERNAL_KEY, {
      expiresIn: '5m',
    });
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
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Clean slate for each test
    await prisma.transaction.deleteMany({ where: { user_id: testUserId } });
    await prisma.wallet.deleteMany({ where: { user_id: testUserId } });
  });

  describe('POST /wallet/internal/create (Internal)', () => {
    it('should create wallet with internal JWT', async () => {
      const internalToken = generateInternalToken();

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
      const internalToken = generateInternalToken();

      // Create first wallet
      await request(app.getHttpServer())
        .post('/wallet/internal/create')
        .set('Authorization', `Bearer ${internalToken}`)
        .send({ userId: testUserId })
        .expect(201);

      // Try to create again - should return 409 Conflict
      await request(app.getHttpServer())
        .post('/wallet/internal/create')
        .set('Authorization', `Bearer ${internalToken}`)
        .send({ userId: testUserId })
        .expect(409); // Conflict
    });

    it('should reject invalid userId', async () => {
      const internalToken = generateInternalToken();

      await request(app.getHttpServer())
        .post('/wallet/internal/create')
        .set('Authorization', `Bearer ${internalToken}`)
        .send({ userId: 'not-a-valid-uuid' })
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
      await request(app.getHttpServer()).get('/wallet/balance').expect(401);
    });

    it('should return 404 if wallet does not exist', async () => {
      const differentUserId = 'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e';
      const externalToken = generateExternalToken(differentUserId);

      await request(app.getHttpServer())
        .get('/wallet/balance')
        .set('Authorization', `Bearer ${externalToken}`)
        .expect(404);
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
          idempotencyKey: 'a1a1a1a1-b2b2-4c3c-8d4d-e5e5e5e5e501',
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
          idempotencyKey: 'a1a1a1a1-b2b2-4c3c-8d4d-e5e5e5e5e502',
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
          amount: 200,
          type: 'DEBIT',
          idempotencyKey: 'a1a1a1a1-b2b2-4c3c-8d4d-e5e5e5e5e503',
        })
        .expect(400);

      // Verify balance unchanged
      const wallet = await prisma.wallet.findUnique({
        where: { user_id: testUserId },
      });
      expect(wallet).toBeDefined();
      expect(Number(wallet!.balance)).toBe(100);
    });

    // Test for True Idempotency
    it('should return same transaction for duplicate idempotency key (true idempotency)', async () => {
      const externalToken = generateExternalToken(testUserId);
      const idempotencyKey = 'a1a1a1a1-b2b2-4c3c-8d4d-e5e5e5e5e504';

      // First transaction
      const firstResponse = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${externalToken}`)
        .send({
          amount: 10,
          type: 'CREDIT',
          idempotencyKey,
        })
        .expect(201);

      const firstTransactionId = firstResponse.body.id;

      // Second transaction with same key, should return 201 with SAME transaction
      const secondResponse = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${externalToken}`)
        .send({
          amount: 10,
          type: 'CREDIT',
          idempotencyKey,
        })
        .expect(201); // TRUE idempotency returns 201

      // Verify it's the same transaction (same ID)
      expect(secondResponse.body.id).toBe(firstTransactionId);
      expect(secondResponse.body.amount).toBe(10);
      expect(secondResponse.body.type).toBe('CREDIT');

      // Verify balance only increased once (100 + 10 = 110, not 120)
      const wallet = await prisma.wallet.findUnique({
        where: { user_id: testUserId },
      });
      expect(wallet).toBeDefined();
      expect(Number(wallet!.balance)).toBe(110);

      // Verify only ONE transaction exists in database
      const transactions = await prisma.transaction.findMany({
        where: {
          user_id: testUserId,
          idempotency_key: idempotencyKey,
        },
      });
      expect(transactions.length).toBe(1);
      expect(transactions[0].id).toBe(firstTransactionId);
    });

    it('should reject transaction without idempotency key', async () => {
      const externalToken = generateExternalToken(testUserId);

      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${externalToken}`)
        .send({
          amount: 50,
          type: 'CREDIT',
        })
        .expect(400);
    });

    it('should reject negative amounts', async () => {
      const externalToken = generateExternalToken(testUserId);

      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${externalToken}`)
        .send({
          amount: -50,
          type: 'CREDIT',
          idempotencyKey: 'a1a1a1a1-b2b2-4c3c-8d4d-e5e5e5e5e505',
        })
        .expect(400);
    });

    // Header-based idempotency
    it('should accept idempotency key from header (header overrides body)', async () => {
      const token = generateExternalToken(testUserId);
      const headerKey = 'a1a1a1a1-b2b2-4c3c-8d4d-e5e5e5e5e506';
      const bodyKey = 'b2b2b2b2-c3c3-4d4d-8e5e-f6f6f6f6f607';

      const response = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${token}`)
        .set('idempotency-key', headerKey)
        .send({
          amount: 100,
          type: 'CREDIT',
          idempotencyKey: bodyKey,
        })
        .expect(201);

      // Verify the HEADER key was used (query by composite key)
      const transactionFromHeader = await prisma.transaction.findUnique({
        where: {
          user_id_idempotency_key: {
            user_id: testUserId,
            idempotency_key: headerKey,
          },
        },
      });
      expect(transactionFromHeader).toBeDefined();
      expect(transactionFromHeader!.id).toBe(response.body.id);

      // Verify the BODY key was NOT used
      const transactionFromBody = await prisma.transaction.findUnique({
        where: {
          user_id_idempotency_key: {
            user_id: testUserId,
            idempotency_key: bodyKey,
          },
        },
      });
      expect(transactionFromBody).toBeNull();
    });

    // Wallet existence validation
    it('should reject transaction when wallet does not exist (404)', async () => {
      const nonExistentUserId = 'd4e5f6a7-b8c9-4d5e-0f1a-2b3c4d5e6f7a';
      const externalToken = generateExternalToken(nonExistentUserId);
      const idempotencyKey = 'a1a1a1a1-b2b2-4c3c-8d4d-e5e5e5e5e510';

      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${externalToken}`)
        .send({
          amount: 50,
          type: 'CREDIT',
          idempotencyKey: idempotencyKey,
        })
        .expect(404);

      // Verify no orphaned transaction was created (query by composite key)
      const transaction = await prisma.transaction.findUnique({
        where: {
          user_id_idempotency_key: {
            user_id: nonExistentUserId,
            idempotency_key: idempotencyKey,
          },
        },
      });
      expect(transaction).toBeNull();
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
            idempotency_key: 'a1a1a1a1-b2b2-4c3c-8d4d-e5e5e5e5e508',
          },
          {
            user_id: testUserId,
            amount: 30,
            type: 'DEBIT',
            idempotency_key: 'a1a1a1a1-b2b2-4c3c-8d4d-e5e5e5e5e509',
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

      const types = response.body.map((t) => t.type);
      expect(types).toContain('CREDIT');
      expect(types).toContain('DEBIT');

      response.body.forEach((transaction) => {
        expect(transaction.userId).toBe(testUserId);
        expect(transaction.id).toBeDefined();
        expect(transaction.amount).toBeDefined();
        expect(transaction.createdAt).toBeDefined();
      });
    });

    it('should only show current user transactions', async () => {
      const otherUserId = 'c3d4e5f6-a7b8-4c5d-9e0f-1a2b3c4d5e6f';

      // Create transaction for different user
      await prisma.wallet.create({
        data: { user_id: otherUserId, balance: 50 },
      });
      await prisma.transaction.create({
        data: {
          user_id: otherUserId,
          amount: 10,
          type: 'CREDIT',
          idempotency_key: 'a1a1a1a1-b2b2-4c3c-8d4d-e5e5e5e5e511',
        },
      });

      const externalToken = generateExternalToken(testUserId);

      const response = await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', `Bearer ${externalToken}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.every((t) => t.userId === testUserId)).toBe(true);

      // Cleanup
      await prisma.transaction.deleteMany({ where: { user_id: otherUserId } });
      await prisma.wallet.deleteMany({ where: { user_id: otherUserId } });
    });
  });
});
