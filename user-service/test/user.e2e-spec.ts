import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { WalletClientService } from '../src/wallet-client/wallet-client.service';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

interface UserProfileResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

describe('User Service (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

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
    await prisma.user.deleteMany();
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  describe('Auth Flow', () => {
    describe('POST /auth/register', () => {
      it('should register a new user', async () => {
        const response = await request(
          app.getHttpServer() as import('http').Server,
        )
          .post('/auth/register')
          .send({
            email: 'test@example.com',
            password: 'Password123',
            first_name: 'John',
            last_name: 'Doe',
          })
          .expect(201);

        const body = response.body as AuthResponse;
        expect(body).toHaveProperty('access_token');
        expect(body.user).toMatchObject({
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
        });

        authToken = body.access_token;
      });

      it('should fail with duplicate email', async () => {
        await request(app.getHttpServer() as import('http').Server)
          .post('/auth/register')
          .send({
            email: 'duplicate@example.com',
            password: 'Password123',
            first_name: 'Jane',
            last_name: 'Doe',
          })
          .expect(201);

        await request(app.getHttpServer() as import('http').Server)
          .post('/auth/register')
          .send({
            email: 'duplicate@example.com',
            password: 'Password456',
            first_name: 'John',
            last_name: 'Smith',
          })
          .expect(409);
      });

      it('should fail with invalid email', async () => {
        await request(app.getHttpServer() as import('http').Server)
          .post('/auth/register')
          .send({
            email: 'invalid-email',
            password: 'Password123',
            first_name: 'John',
            last_name: 'Doe',
          })
          .expect(400);
      });

      it('should fail with short password', async () => {
        await request(app.getHttpServer() as import('http').Server)
          .post('/auth/register')
          .send({
            email: 'test@example.com',
            password: '123',
            first_name: 'John',
            last_name: 'Doe',
          })
          .expect(400);
      });
    });

    describe('POST /auth/login', () => {
      beforeEach(async () => {
        await request(app.getHttpServer() as import('http').Server)
          .post('/auth/register')
          .send({
            email: 'login@example.com',
            password: 'Password123',
            first_name: 'Login',
            last_name: 'User',
          });
      });

      it('should login with valid credentials', async () => {
        const response = await request(
          app.getHttpServer() as import('http').Server,
        )
          .post('/auth/login')
          .send({
            email: 'login@example.com',
            password: 'Password123',
          })
          .expect(200);

        const body = response.body as AuthResponse;
        expect(body).toHaveProperty('access_token');
        expect(body.user).toMatchObject({
          email: 'login@example.com',
          first_name: 'Login',
          last_name: 'User',
        });
      });

      it('should fail with invalid email', async () => {
        await request(app.getHttpServer() as import('http').Server)
          .post('/auth/login')
          .send({
            email: 'wrong@example.com',
            password: 'Password123',
          })
          .expect(401);
      });

      it('should fail with invalid password', async () => {
        await request(app.getHttpServer() as import('http').Server)
          .post('/auth/login')
          .send({
            email: 'login@example.com',
            password: 'wrongpassword',
          })
          .expect(401);
      });
    });
  });

  describe('User Profile', () => {
    beforeEach(async () => {
      const response = await request(
        app.getHttpServer() as import('http').Server,
      )
        .post('/auth/register')
        .send({
          email: 'profile@example.com',
          password: 'Password123',
          first_name: 'Profile',
          last_name: 'User',
        });

      authToken = (response.body as AuthResponse).access_token;
    });

    describe('GET /user/profile', () => {
      it('should get user profile', async () => {
        const response = await request(
          app.getHttpServer() as import('http').Server,
        )
          .get('/user/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          email: 'profile@example.com',
          first_name: 'Profile',
          last_name: 'User',
        });
      });

      it('should fail without token', async () => {
        await request(app.getHttpServer() as import('http').Server)
          .get('/user/profile')
          .expect(401);
      });

      it('should fail with invalid token', async () => {
        await request(app.getHttpServer() as import('http').Server)
          .get('/user/profile')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);
      });
    });

    describe('PUT /user/profile', () => {
      it('should update user profile', async () => {
        const response = await request(
          app.getHttpServer() as import('http').Server,
        )
          .put('/user/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            first_name: 'Updated',
            last_name: 'Name',
          })
          .expect(200);

        expect(response.body).toMatchObject({
          first_name: 'Updated',
          last_name: 'Name',
        });
      });

      it('should partially update profile', async () => {
        const response = await request(
          app.getHttpServer() as import('http').Server,
        )
          .put('/user/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            first_name: 'OnlyFirst',
          })
          .expect(200);

        const body = response.body as UserProfileResponse;
        expect(body.first_name).toBe('OnlyFirst');
        expect(body.last_name).toBe('User');
      });

      it('should fail without token', async () => {
        await request(app.getHttpServer() as import('http').Server)
          .put('/user/profile')
          .send({
            first_name: 'Updated',
          })
          .expect(401);
      });
    });
  });

  describe('Registration Rollback', () => {
    it('should not persist user if wallet creation fails', async () => {
      const moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(WalletClientService)
        .useValue({
          createWallet: jest
            .fn()
            .mockRejectedValue(new Error('Wallet service unavailable')),
        })
        .compile();

      const testApp = moduleFixture.createNestApplication();
      testApp.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      await testApp.init();
      const testPrisma = moduleFixture.get<PrismaService>(PrismaService);

      const response = await request(
        testApp.getHttpServer() as import('http').Server,
      )
        .post('/auth/register')
        .send({
          email: 'rollback@example.com',
          password: 'Password123',
          first_name: 'Roll',
          last_name: 'Back',
        });

      expect(response.status).toBe(503);

      const user = await testPrisma.user.findUnique({
        where: { email: 'rollback@example.com' },
      });
      expect(user).toBeNull();

      await testApp.close();
    });
  });

  describe('Email Normalization on Login', () => {
    it('should authenticate successfully when login email case differs from registration', async () => {
      await request(app.getHttpServer() as import('http').Server)
        .post('/auth/register')
        .send({
          email: 'MixedCase@Example.COM',
          password: 'Password123',
          first_name: 'Mixed',
          last_name: 'Case',
        })
        .expect(201);

      const response = await request(
        app.getHttpServer() as import('http').Server,
      )
        .post('/auth/login')
        .send({
          email: 'MIXEDCASE@EXAMPLE.COM',
          password: 'Password123',
        })
        .expect(200);

      const body = response.body as AuthResponse;
      expect(body).toHaveProperty('access_token');
      expect(body.user.email).toBe('mixedcase@example.com');
    });
  });
});
