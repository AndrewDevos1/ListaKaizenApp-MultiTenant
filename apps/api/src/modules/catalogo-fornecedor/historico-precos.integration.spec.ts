import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';
import { CatalogoFornecedorService } from './catalogo-fornecedor.service';

// Integração HTTP + PostgreSQL real descartável (nome deve conter _test). Pulada sem TEST_DATABASE_URL.
const url = process.env.TEST_DATABASE_URL;
const d = url && /_test/.test(url) ? describe : describe.skip;
jest.setTimeout(120000);

d('histórico de preços (HTTP + PostgreSQL real)', () => {
  let app: INestApplication; let prisma: PrismaService; let jwt: JwtService; let service: CatalogoFornecedorService;
  let A: number, B: number, fA: number, item: number, uA: number, uB: number, uC: number;
  const tok = (id: number, role: string, rid: number | null) => jwt.sign({ sub: id, email: `${id}@t.io`, role, restauranteId: rid });
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const put = (t: string, body: object) => request(app.getHttpServer()).put(`/api/v1/admin/fornecedores/${fA}/itens/${item}`).set(auth(t)).send(body);
  const hist = (t: string, q = '') => request(app.getHttpServer()).get(`/api/v1/admin/fornecedores/${fA}/itens/${item}/historico-precos${q}`).set(auth(t));

  beforeAll(async () => {
    process.env.DATABASE_URL = url; process.env.JWT_SECRET = 'int-test-secret';
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication(); app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService); jwt = app.get(JwtService); service = app.get(CatalogoFornecedorService);
    const s = Date.now();
    A = (await prisma.restaurante.create({ data: { nome: `HA${s}` } })).id;
    B = (await prisma.restaurante.create({ data: { nome: `HB${s}` } })).id;
    fA = (await prisma.fornecedor.create({ data: { nome: 'FA', restauranteId: A } })).id;
    const mk = async (n: string, role: any, rid: number) => (await prisma.usuario.create({ data: { nome: n, email: `${n}${s}@t.io`, senha: 'x', role, aprovado: true, restauranteId: rid } })).id;
    uA = await mk('hadmA', 'ADMIN', A); uB = await mk('hadmB', 'ADMIN', B); uC = await mk('hcolab', 'COLLABORATOR', A);
    item = (await prisma.item.create({ data: { nome: 'Arroz', unidadeMedida: 'kg', restauranteId: A, fornecedorId: fA } })).id;
  });
  afterAll(async () => { await app?.close(); });

  it('primeira definição de preço gera evento (anterior nulo); mudança gera novo; no-op não gera', async () => {
    expect((await put(tok(uA, 'ADMIN', A), { precoAtual: 10 })).status).toBe(200);
    expect((await put(tok(uA, 'ADMIN', A), { precoAtual: 10 })).status).toBe(200); // idempotente
    expect((await put(tok(uA, 'ADMIN', A), { precoAtual: 12.5 })).status).toBe(200);
    const r = await hist(tok(uA, 'ADMIN', A));
    expect(r.status).toBe(200);
    expect(r.body.total).toBe(2);
    expect(r.body.eventos.map((e: any) => [e.precoAnterior, e.precoNovo])).toEqual([['10', '12.5'], [null, '10']].map(([a, n]) => [a, n]));
    expect(r.body.eventos[0]).toMatchObject({ autorId: uA, origem: 'CATALOGO', moeda: 'BRL' });
  });

  it('atualizar sem mudar preço (só marca) não cria evento', async () => {
    await put(tok(uA, 'ADMIN', A), { marca: 'Tio João' });
    expect((await hist(tok(uA, 'ADMIN', A))).body.total).toBe(2);
  });

  it('rollback: falha na transação não deixa evento nem preço novo', async () => {
    const antes = await prisma.item.findUniqueOrThrow({ where: { id: item } });
    await expect(prisma.$transaction(async (tx) => {
      await service.atualizarPrecoItem(tx, item, A, 99, { id: uA, nome: 'x' });
      throw new Error('falha forçada');
    })).rejects.toThrow('falha forçada');
    const depois = await prisma.item.findUniqueOrThrow({ where: { id: item } });
    expect(String(depois.precoAtual)).toBe(String(antes.precoAtual));
    expect(await prisma.historicoPrecoItem.count({ where: { itemId: item } })).toBe(2);
  });

  it('banco rejeita UPDATE e DELETE do histórico (append-only)', async () => {
    const ev = await prisma.historicoPrecoItem.findFirstOrThrow({ where: { itemId: item } });
    await expect(prisma.historicoPrecoItem.update({ where: { id: ev.id }, data: { precoNovo: 1 } })).rejects.toThrow(/append-only/);
    await expect(prisma.historicoPrecoItem.delete({ where: { id: ev.id } })).rejects.toThrow(/append-only/);
  });

  it('banco rejeita preço negativo', async () => {
    await expect(prisma.historicoPrecoItem.create({ data: { restauranteId: A, itemId: item, precoNovo: -1, autorId: uA, autorNome: 'x' } })).rejects.toThrow();
  });

  it('paginação e ordenação decrescente', async () => {
    const r = await hist(tok(uA, 'ADMIN', A), '?tamanho=1&pagina=2');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ total: 2, pagina: 2, tamanho: 1 });
    expect(r.body.eventos).toHaveLength(1);
    expect(r.body.eventos[0].precoAnterior).toBeNull();
  });

  it('isolamento: Admin B e COLLABORATOR não leem nem alteram', async () => {
    expect((await hist(tok(uB, 'ADMIN', B))).status).toBe(404);
    expect((await put(tok(uB, 'ADMIN', B), { precoAtual: 1 })).status).toBe(404);
    expect((await hist(tok(uC, 'COLLABORATOR', A))).status).toBe(403);
    expect((await put(tok(uC, 'COLLABORATOR', A), { precoAtual: 1 })).status).toBe(403);
    expect(await prisma.historicoPrecoItem.count({ where: { itemId: item } })).toBe(2);
  });

  it('valida preço: negativo e mais de 2 casas -> 400, sem evento', async () => {
    expect((await put(tok(uA, 'ADMIN', A), { precoAtual: -1 })).status).toBe(400);
    expect((await put(tok(uA, 'ADMIN', A), { precoAtual: 1.234 })).status).toBe(400);
    expect(await prisma.historicoPrecoItem.count({ where: { itemId: item } })).toBe(2);
  });
});
