import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const testUser = {
    nome: 'Test User',
    email: `test-${Date.now()}@example.com`,
    senha: 'password123',
  };

  it('/api/auth/register (POST) - should register a new user', () => {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send(testUser)
      .expect(201)
      .expect((res) => {
        expect(res.body.message).toContain('Registro realizado');
        expect(res.body.user.email).toBe(testUser.email);
      });
  });

  it('/api/auth/login (POST) - should reject unapproved user', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: testUser.email, senha: testUser.senha })
      .expect(401);
  });

  it('/api/auth/login (POST) - should reject invalid credentials', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'nonexistent@example.com', senha: 'wrong' })
      .expect(401);
  });

  it('/api/auth/profile (GET) - should reject without token', () => {
    return request(app.getHttpServer())
      .get('/api/auth/profile')
      .expect(401);
  });
});
