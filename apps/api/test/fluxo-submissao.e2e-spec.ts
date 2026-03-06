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
  let areaId: number;
  let submissaoId: number;
  let adminEmail: string;
  let collabEmail: string;
  let collabSemListaEmail: string;
  let collabOutroRestauranteId: number;
  let itemOutroRestauranteId: number;
  let submissaoOutroRestauranteId: number;
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

    const outroRestaurante = await prisma.restaurante.create({
      data: { nome: 'Restaurante E2E 2' },
    });

    const senhaHash = await bcrypt.hash(senha, 10);
    adminEmail = `admin.e2e.${Date.now()}@kaizen.test`;
    collabEmail = `collab.e2e.${Date.now()}@kaizen.test`;
    collabSemListaEmail = `collab.sem.lista.${Date.now()}@kaizen.test`;

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

    await prisma.usuario.create({
      data: {
        nome: 'Colaborador Sem Lista',
        email: collabSemListaEmail,
        senha: senhaHash,
        role: UserRole.COLLABORATOR,
        aprovado: true,
        ativo: true,
        restauranteId: restaurante.id,
      },
    });

    const colaboradorOutroRestaurante = await prisma.usuario.create({
      data: {
        nome: 'Colaborador Outro Restaurante',
        email: `collab.outro.${Date.now()}@kaizen.test`,
        senha: senhaHash,
        role: UserRole.COLLABORATOR,
        aprovado: true,
        ativo: true,
        restauranteId: outroRestaurante.id,
      },
    });
    collabOutroRestauranteId = colaboradorOutroRestaurante.id;

    const lista = await prisma.lista.create({
      data: {
        nome: 'Lista E2E',
        restauranteId: restaurante.id,
      },
    });
    listaId = lista.id;

    const area = await prisma.area.create({
      data: {
        nome: 'Area E2E',
        restauranteId: restaurante.id,
      },
    });
    areaId = area.id;

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

    const listaOutroRestaurante = await prisma.lista.create({
      data: {
        nome: 'Lista Outro Restaurante',
        restauranteId: outroRestaurante.id,
      },
    });

    const itemOutroRestaurante = await prisma.item.create({
      data: {
        nome: 'Cebola E2E',
        unidadeMedida: 'kg',
        restauranteId: outroRestaurante.id,
      },
    });
    itemOutroRestauranteId = itemOutroRestaurante.id;

    const submissaoOutroRestaurante = await prisma.submissao.create({
      data: {
        listaId: listaOutroRestaurante.id,
        usuarioId: colaboradorOutroRestaurante.id,
        restauranteId: outroRestaurante.id,
        status: StatusSubmissao.APROVADO,
        pedidos: {
          create: [
            {
              itemId: itemOutroRestaurante.id,
              qtdSolicitada: 5,
              status: StatusPedido.APROVADO,
            },
          ],
        },
      },
    });
    submissaoOutroRestauranteId = submissaoOutroRestaurante.id;

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

  it('deve bloquear vinculo de colaborador de outro restaurante na lista', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, senha })
      .expect(201);

    const adminToken = adminLogin.body.accessToken as string;

    await request(app.getHttpServer())
      .post(`/api/v1/listas/${listaId}/colaboradores`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ usuarioId: collabOutroRestauranteId })
      .expect(404);
  });

  it('deve bloquear setColaboradores da area com colaborador de outro restaurante', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, senha })
      .expect(201);

    const adminToken = adminLogin.body.accessToken as string;

    await request(app.getHttpServer())
      .post(`/api/v1/areas/${areaId}/colaboradores`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ colaboradorIds: [collabOutroRestauranteId] })
      .expect(404);
  });

  it('deve bloquear criacao de lista rapida com item de outro restaurante', async () => {
    const collabLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: collabEmail, senha })
      .expect(201);

    const collabToken = collabLogin.body.accessToken as string;

    await request(app.getHttpServer())
      .post('/api/v1/collaborator/listas-rapidas')
      .set('Authorization', `Bearer ${collabToken}`)
      .send({
        nome: 'Lista Rapida Invalida',
        itens: [
          {
            nome: 'Item Outro Tenant',
            itemId: itemOutroRestauranteId,
            quantidade: 1,
            unidade: 'kg',
          },
        ],
      })
      .expect(404);
  });

  it('deve bloquear submissao de lista para colaborador nao atribuido', async () => {
    const collabSemListaLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: collabSemListaEmail, senha })
      .expect(201);

    const collabSemListaToken = collabSemListaLogin.body.accessToken as string;

    await request(app.getHttpServer())
      .post(`/api/v1/collaborator/listas/${listaId}/submeter`)
      .set('Authorization', `Bearer ${collabSemListaToken}`)
      .expect(404);
  });

  it('deve bloquear criacao de checklist com submissao de outro restaurante', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, senha })
      .expect(201);

    const adminToken = adminLogin.body.accessToken as string;

    await request(app.getHttpServer())
      .post('/api/v1/admin/checklists')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ submissaoId: submissaoOutroRestauranteId })
      .expect(404);
  });

  it('deve bloquear criacao de cotacao com submissao de outro restaurante', async () => {
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, senha })
      .expect(201);

    const adminToken = adminLogin.body.accessToken as string;

    await request(app.getHttpServer())
      .post('/api/v1/admin/cotacoes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ titulo: 'Cotacao invalida', submissaoIds: [submissaoOutroRestauranteId] })
      .expect(404);
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

    const confirmacaoColab = await request(app.getHttpServer())
      .post(`/api/v1/collaborator/submissoes/${submissaoId}/recebimento`)
      .set('Authorization', `Bearer ${collabToken}`)
      .send({
        itensConfirmados: [collabView.body.pedidos[0].id],
        observacoes: 'Recebido integralmente',
      })
      .expect(201);

    expect(confirmacaoColab.body.submissaoId).toBe(submissaoId);
    expect(confirmacaoColab.body.confirmadoPorId).toBeTruthy();
    expect(confirmacaoColab.body.itens).toHaveLength(1);
    expect(confirmacaoColab.body.itens[0].confirmado).toBe(true);

    const recebimentoColab = await request(app.getHttpServer())
      .get(`/api/v1/collaborator/submissoes/${submissaoId}/recebimento`)
      .set('Authorization', `Bearer ${collabToken}`)
      .expect(200);

    expect(recebimentoColab.body.id).toBe(confirmacaoColab.body.id);
    expect(recebimentoColab.body.confirmadoPor).toBeDefined();

    const confirmacaoAdmin = await request(app.getHttpServer())
      .post(`/api/v1/admin/submissoes/${submissaoId}/recebimento`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ itensConfirmados: [collabView.body.pedidos[0].id] })
      .expect(201);

    expect(confirmacaoAdmin.body.confirmadoAdminId).toBeTruthy();

    await request(app.getHttpServer())
      .delete(`/api/v1/admin/submissoes/${submissaoId}/recebimento`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/admin/submissoes/${submissaoId}/recebimento`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);
  });
});
