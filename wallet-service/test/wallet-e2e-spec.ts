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

      // Try to create again
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
          amount: 200,
          type: 'DEBIT',
          idempotencyKey: 'debit-fail-001',
        })
        .expect(400);

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
          idempotencyKey,
        })
        .expect(409);

      // Verify balance only increased once
      const wallet = await prisma.wallet.findUnique({
        where: { user_id: testUserId },
      });
      expect(wallet).toBeDefined();
      expect(Number(wallet!.balance)).toBe(110);
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
          idempotencyKey: 'negative-test-001',
        })
        .expect(400);
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
          idempotencyKey: 'body-key',
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
          idempotency_key: 'other-user-001',
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
