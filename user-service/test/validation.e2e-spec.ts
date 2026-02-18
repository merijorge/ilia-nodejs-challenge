import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

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

describe('Input Validation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
    await prisma.user.deleteMany();
  });

  describe('Registration Validation', () => {
    it('should reject invalid email format', async () => {
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

    it('should reject weak password (no uppercase)', async () => {
      await request(app.getHttpServer() as import('http').Server)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          first_name: 'John',
          last_name: 'Doe',
        })
        .expect(400);
    });

    it('should reject weak password (no lowercase)', async () => {
      await request(app.getHttpServer() as import('http').Server)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'PASSWORD123',
          first_name: 'John',
          last_name: 'Doe',
        })
        .expect(400);
    });

    it('should reject weak password (no number)', async () => {
      await request(app.getHttpServer() as import('http').Server)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'PasswordABC',
          first_name: 'John',
          last_name: 'Doe',
        })
        .expect(400);
    });

    it('should reject password too short', async () => {
      await request(app.getHttpServer() as import('http').Server)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Pas1',
          first_name: 'John',
          last_name: 'Doe',
        })
        .expect(400);
    });

    it('should reject password too long', async () => {
      const longPassword = 'A1' + 'a'.repeat(127);
      await request(app.getHttpServer() as import('http').Server)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: longPassword,
          first_name: 'John',
          last_name: 'Doe',
        })
        .expect(400);
    });

    it('should reject name with numbers', async () => {
      await request(app.getHttpServer() as import('http').Server)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123',
          first_name: 'John123',
          last_name: 'Doe',
        })
        .expect(400);
    });

    it('should reject name with special characters', async () => {
      await request(app.getHttpServer() as import('http').Server)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123',
          first_name: 'John<script>',
          last_name: 'Doe',
        })
        .expect(400);
    });

    it('should reject name too long', async () => {
      const longName = 'a'.repeat(101);
      await request(app.getHttpServer() as import('http').Server)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123',
          first_name: longName,
          last_name: 'Doe',
        })
        .expect(400);
    });

    it('should normalize email to lowercase', async () => {
      const response = await request(
        app.getHttpServer() as import('http').Server,
      )
        .post('/auth/register')
        .send({
          email: 'Test@Example.COM',
          password: 'Password123',
          first_name: 'John',
          last_name: 'Doe',
        })
        .expect(201);

      expect((response.body as AuthResponse).user.email).toBe(
        'test@example.com',
      );
    });

    it('should trim whitespace from names', async () => {
      const response = await request(
        app.getHttpServer() as import('http').Server,
      )
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123',
          first_name: '  John  ',
          last_name: '  Doe  ',
        })
        .expect(201);

      const body = (response.body as AuthResponse).user;
      expect(body.first_name).toBe('John');
      expect(body.last_name).toBe('Doe');
    });

    it('should accept valid names with hyphens and apostrophes', async () => {
      await request(app.getHttpServer() as import('http').Server)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123',
          first_name: 'Mary-Anne',
          last_name: "O'Connor",
        })
        .expect(201);
    });

    it('should reject unknown properties', async () => {
      await request(app.getHttpServer() as import('http').Server)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123',
          first_name: 'John',
          last_name: 'Doe',
          malicious_field: 'hack',
        })
        .expect(400);
    });
  });

  describe('Profile Update Validation', () => {
    let authToken: string;

    beforeEach(async () => {
      const response = await request(
        app.getHttpServer() as import('http').Server,
      )
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123',
          first_name: 'John',
          last_name: 'Doe',
        });
      authToken = (response.body as AuthResponse).access_token;
    });

    it('should reject invalid name format on update', async () => {
      await request(app.getHttpServer() as import('http').Server)
        .put('/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          first_name: 'Invalid123',
        })
        .expect(400);
    });

    it('should trim whitespace on profile update', async () => {
      const response = await request(
        app.getHttpServer() as import('http').Server,
      )
        .put('/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          first_name: '  Jane  ',
        })
        .expect(200);

      expect((response.body as UserProfileResponse).first_name).toBe('Jane');
    });
  });
});
