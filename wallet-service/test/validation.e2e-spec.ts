import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
const request = require('supertest');

describe('Wallet Validation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let authToken: string;
  const userId = '550e8400-e29b-41d4-a716-446655440000';

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
    jwtService = app.get<JwtService>(JwtService);

    authToken = jwtService.sign({ sub: userId, email: 'test@example.com' });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.transaction.deleteMany();
    await prisma.wallet.deleteMany();
    await prisma.wallet.create({
      data: { user_id:userId, balance: 1000 },
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
          idempotencyKey: '660e8400-e29b-41d4-a716-446655440001',
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
          idempotencyKey: '660e8400-e29b-41d4-a716-446655440001',
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
          idempotencyKey: '660e8400-e29b-41d4-a716-446655440001',
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
          idempotencyKey: '660e8400-e29b-41d4-a716-446655440001',
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
          idempotencyKey: '660e8400-e29b-41d4-a716-446655440001',
          malicious_field: 'hack',
        })
        .expect(400);
    });

    it('should round amount to 2 decimal places automatically', async () => {
      const response = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100.999,
          type: 'CREDIT',
          idempotencyKey: '660e8400-e29b-41d4-a716-446655440001',
        })
        .expect(201);

      expect(response.body.amount).toBe(101);
    });
  });
});
