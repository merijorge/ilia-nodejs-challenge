import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
const request = require('supertest');

describe('User Service (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;

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
    // Clean database before each test
    await prisma.user.deleteMany();
  });

  describe('Auth Flow', () => {
    describe('POST /auth/register', () => {
      it('should register a new user', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: 'test@example.com',
            password: 'password123',
            first_name: 'John',
            last_name: 'Doe',
          })
          .expect(201);

        expect(response.body).toHaveProperty('access_token');
        expect(response.body.user).toMatchObject({
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
        });

        authToken = response.body.access_token;
        userId = response.body.user.id;
      });

      it('should fail with duplicate email', async () => {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: 'duplicate@example.com',
            password: 'password123',
            first_name: 'Jane',
            last_name: 'Doe',
          })
          .expect(201);

        await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: 'duplicate@example.com',
            password: 'password456',
            first_name: 'John',
            last_name: 'Smith',
          })
          .expect(409);
      });

      it('should fail with invalid email', async () => {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: 'invalid-email',
            password: 'password123',
            first_name: 'John',
            last_name: 'Doe',
          })
          .expect(400);
      });

      it('should fail with short password', async () => {
        await request(app.getHttpServer())
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
        await request(app.getHttpServer()).post('/auth/register').send({
          email: 'login@example.com',
          password: 'password123',
          first_name: 'Login',
          last_name: 'User',
        });
      });

      it('should login with valid credentials', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'login@example.com',
            password: 'password123',
          })
          .expect(200);

        expect(response.body).toHaveProperty('access_token');
        expect(response.body.user).toMatchObject({
          email: 'login@example.com',
          first_name: 'Login',
          last_name: 'User',
        });
      });

      it('should fail with invalid email', async () => {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'wrong@example.com',
            password: 'password123',
          })
          .expect(401);
      });

      it('should fail with invalid password', async () => {
        await request(app.getHttpServer())
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
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'profile@example.com',
          password: 'password123',
          first_name: 'Profile',
          last_name: 'User',
        });

      authToken = response.body.access_token;
    });

    describe('GET /user/profile', () => {
      it('should get user profile', async () => {
        const response = await request(app.getHttpServer())
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
        await request(app.getHttpServer()).get('/user/profile').expect(401);
      });

      it('should fail with invalid token', async () => {
        await request(app.getHttpServer())
          .get('/user/profile')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);
      });
    });

    describe('PUT /user/profile', () => {
      it('should update user profile', async () => {
        const response = await request(app.getHttpServer())
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
        const response = await request(app.getHttpServer())
          .put('/user/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            first_name: 'OnlyFirst',
          })
          .expect(200);

        expect(response.body.first_name).toBe('OnlyFirst');
        expect(response.body.last_name).toBe('User');
      });

      it('should fail without token', async () => {
        await request(app.getHttpServer())
          .put('/user/profile')
          .send({
            first_name: 'Updated',
          })
          .expect(401);
      });
    });
  });
});
