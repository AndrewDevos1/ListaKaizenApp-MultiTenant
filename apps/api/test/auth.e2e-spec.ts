import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import type { Response as SupertestResponse } from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';
import {
  createSchemaName,
  prepareIsolatedDatabase,
  truncateAllTables,
} from './helpers/e2e-db';

jest.setTimeout(120000);

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const schema = process.env.E2E_DB_SCHEMA || createSchemaName('e2e_auth');

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL não configurada para testes E2E');
    }

    prepareIsolatedDatabase(process.env.DATABASE_URL, schema);

    prisma = new PrismaClient();
    await prisma.$connect();
    await truncateAllTables(prisma);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (prisma) {
      await truncateAllTables(prisma);
      await prisma.$disconnect();
    }
  });

  const testUser = {
    nome: 'Test User',
    email: `test-${Date.now()}@example.com`,
    senha: 'password123',
  };

  it('/api/v1/auth/register (POST) - should register a new user', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(testUser)
      .expect(201)
      .expect((res: SupertestResponse) => {
        expect(res.body.message).toContain('Registro realizado');
        expect(res.body.user.email).toBe(testUser.email);
      });
  });

  it('/api/v1/auth/login (POST) - should reject unapproved user', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, senha: testUser.senha })
      .expect(401);
  });

  it('/api/v1/auth/login (POST) - should reject invalid credentials', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'nonexistent@example.com', senha: 'wrong' })
      .expect(401);
  });

  it('/api/v1/auth/profile (GET) - should reject without token', () => {
    return request(app.getHttpServer())
      .get('/api/v1/auth/profile')
      .expect(401);
  });
});
