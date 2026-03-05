import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaClient, StatusPedido, StatusSubmissao, UserRole } from '@prisma/client';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import {
  createSchemaName,
  prepareIsolatedDatabase,
  truncateAllTables,
} from './helpers/e2e-db';

jest.setTimeout(120000);

describe('Fluxo E2E — colaborador -> submissao -> admin', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  let listaId: number;
  let submissaoId: number;
  let adminEmail: string;
  let collabEmail: string;
  const senha = 'admin123';
  const schema = process.env.E2E_DB_SCHEMA || createSchemaName('e2e_fluxo_submissao');

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL não configurada para testes E2E');
    }

    prepareIsolatedDatabase(process.env.DATABASE_URL, schema);

    prisma = new PrismaClient();
    await prisma.$connect();
    await truncateAllTables(prisma);

    const restaurante = await prisma.restaurante.create({
      data: { nome: 'Restaurante E2E' },
    });

    const senhaHash = await bcrypt.hash(senha, 10);
    adminEmail = `admin.e2e.${Date.now()}@kaizen.test`;
    collabEmail = `collab.e2e.${Date.now()}@kaizen.test`;

    const admin = await prisma.usuario.create({
      data: {
        nome: 'Admin E2E',
        email: adminEmail,
        senha: senhaHash,
        role: UserRole.ADMIN,
        aprovado: true,
        ativo: true,
        restauranteId: restaurante.id,
      },
    });

    const colaborador = await prisma.usuario.create({
      data: {
        nome: 'Colaborador E2E',
        email: collabEmail,
        senha: senhaHash,
        role: UserRole.COLLABORATOR,
        aprovado: true,
        ativo: true,
        restauranteId: restaurante.id,
      },
    });

    const lista = await prisma.lista.create({
      data: {
        nome: 'Lista E2E',
        restauranteId: restaurante.id,
      },
    });
    listaId = lista.id;

    await prisma.listaColaborador.create({
      data: {
        listaId: lista.id,
        usuarioId: colaborador.id,
      },
    });

    const item = await prisma.item.create({
      data: {
        nome: 'Tomate E2E',
        unidadeMedida: 'kg',
        restauranteId: restaurante.id,
      },
    });

    await prisma.listaItemRef.create({
      data: {
        listaId: lista.id,
        itemId: item.id,
        quantidadeMinima: 10,
        quantidadeAtual: 4,
        usaThreshold: true,
      },
    });

    // Garante que o setup realmente criou o cenário mínimo esperado.
    const sanity = await prisma.lista.findUnique({
      where: { id: lista.id },
      include: { itensRef: true, colaboradores: true },
    });
    expect(sanity?.itensRef.length).toBe(1);
    expect(sanity?.colaboradores.length).toBe(1);
    expect(admin.id).toBeGreaterThan(0);

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

  it('deve executar o fluxo completo de submissao e aprovacao', async () => {
    const collabLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: collabEmail, senha })
      .expect(201);

    const collabToken = collabLogin.body.accessToken as string;
    expect(collabToken).toBeTruthy();

    const submitRes = await request(app.getHttpServer())
      .post(`/api/v1/collaborator/listas/${listaId}/submeter`)
      .set('Authorization', `Bearer ${collabToken}`)
      .expect(201);

    submissaoId = submitRes.body.id;
    expect(submitRes.body.status).toBe(StatusSubmissao.PENDENTE);
    expect(submitRes.body.pedidos).toHaveLength(1);
    expect(submitRes.body.pedidos[0].qtdSolicitada).toBe(6);

    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, senha })
      .expect(201);

    const adminToken = adminLogin.body.accessToken as string;
    expect(adminToken).toBeTruthy();

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/admin/submissoes')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const registrada = listRes.body.find(
      (s: { id: number; status: StatusSubmissao }) => s.id === submissaoId,
    );
    expect(registrada).toBeDefined();
    expect(registrada.status).toBe(StatusSubmissao.PENDENTE);

    const approveRes = await request(app.getHttpServer())
      .post(`/api/v1/admin/submissoes/${submissaoId}/aprovar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    expect(approveRes.body.status).toBe(StatusSubmissao.APROVADO);
    expect(approveRes.body.pedidos[0].status).toBe(StatusPedido.APROVADO);

    const collabView = await request(app.getHttpServer())
      .get(`/api/v1/collaborator/submissoes/${submissaoId}`)
      .set('Authorization', `Bearer ${collabToken}`)
      .expect(200);

    expect(collabView.body.status).toBe(StatusSubmissao.APROVADO);
    expect(collabView.body.pedidos[0].status).toBe(StatusPedido.APROVADO);
  });
});
