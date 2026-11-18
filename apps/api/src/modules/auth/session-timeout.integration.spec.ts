import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';

// HTTP + PostgreSQL real descartável (nome deve conter _test). Pulada sem TEST_DATABASE_URL.
const url = process.env.TEST_DATABASE_URL;
const d = url && /_test/.test(url) ? describe : describe.skip;
jest.setTimeout(120000);

d('timeout de sessão (issue #7)', () => {
  let app: INestApplication; let prisma: PrismaService; let jwt: JwtService;
  let A: number, B: number, admA: number, admB: number, colA: number, supA: number;
  const s = Date.now();
  const tok = (id: number, role: string, rid: number | null) => jwt.sign({ sub: id, email: `${id}@t.io`, role, restauranteId: rid });
  const au = (t: string) => ({ Authorization: `Bearer ${t}` });
  const http = () => request(app.getHttpServer());
  const putUser = (t: string, id: number, body: object, q = '') => http().put(`/api/v1/admin/usuarios/${id}${q}`).set(au(t)).send(body);
  const putRest = (t: string, id: number, body: object) => http().put(`/api/restaurantes/${id}/session-timeout`).set(au(t)).send(body);
  const login = (email: string) => http().post('/api/v1/auth/login').send({ email, senha: 'Senha123' });
  const profile = (t: string) => http().get('/api/v1/auth/profile').set(au(t));

  beforeAll(async () => {
    process.env.DATABASE_URL = url; process.env.JWT_SECRET = 'int-test-secret';
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication(); app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService); jwt = app.get(JwtService);
    const senha = await bcrypt.hash('Senha123', 4);
    A = (await prisma.restaurante.create({ data: { nome: `SA${s}` } })).id;
    B = (await prisma.restaurante.create({ data: { nome: `SB${s}` } })).id;
    const mk = async (n: string, role: any, rid: number | null) => (await prisma.usuario.create({ data: { nome: n, email: `${n}${s}@t.io`, senha, role, aprovado: true, restauranteId: rid } })).id;
    admA = await mk('sadmA', 'ADMIN', A); admB = await mk('sadmB', 'ADMIN', B); colA = await mk('scolA', 'COLLABORATOR', A); supA = await mk('ssup', 'SUPER_ADMIN', null);
  });
  afterAll(async () => { await app?.close(); });

  it('default do restaurante é 30 e login/profile expõem', async () => {
    const r = await login(`scolA${s}@t.io`);
    expect(r.status).toBe(201);
    expect(r.body.user.sessionTimeoutMinutos).toBe(30);
    expect((await profile(r.body.accessToken)).body.sessionTimeoutMinutos).toBe(30);
  });

  it('precedência usuário > restaurante', async () => {
    expect((await putRest(tok(admA, 'ADMIN', A), A, { sessionTimeoutMinutos: 60 })).status).toBe(200);
    let r = await login(`scolA${s}@t.io`);
    expect(r.body.user.sessionTimeoutMinutos).toBe(60);
    expect((await putUser(tok(admA, 'ADMIN', A), colA, { sessionTimeoutMinutos: 15 })).status).toBe(200);
    r = await login(`scolA${s}@t.io`);
    expect(r.body.user.sessionTimeoutMinutos).toBe(15);
    expect((await profile(r.body.accessToken)).body.sessionTimeoutMinutos).toBe(15);
    expect((await putUser(tok(admA, 'ADMIN', A), colA, { sessionTimeoutMinutos: null })).status).toBe(200);
    expect((await login(`scolA${s}@t.io`)).body.user.sessionTimeoutMinutos).toBe(60);
  });

  it.each([[4, 400], [5, 200], [480, 200], [481, 400]])('limites usuário %i -> %i', async (v, st) => {
    expect((await putUser(tok(admA, 'ADMIN', A), colA, { sessionTimeoutMinutos: v })).status).toBe(st);
  });
  it.each([[4, 400], [5, 200], [480, 200], [481, 400]])('limites restaurante %i -> %i', async (v, st) => {
    expect((await putRest(tok(admA, 'ADMIN', A), A, { sessionTimeoutMinutos: v })).status).toBe(st);
  });

  it('banco rejeita fora da faixa (CHECK)', async () => {
    await expect(prisma.restaurante.update({ where: { id: A }, data: { sessionTimeoutMinutos: 4 } })).rejects.toThrow();
    await expect(prisma.usuario.update({ where: { id: colA }, data: { sessionTimeoutMinutos: 481 } })).rejects.toThrow();
  });

  it('isolamento A/B: ADMIN não altera outro tenant', async () => {
    expect((await putRest(tok(admB, 'ADMIN', B), A, { sessionTimeoutMinutos: 99 })).status).toBe(403);
    expect((await putUser(tok(admB, 'ADMIN', B), colA, { sessionTimeoutMinutos: 99 })).status).toBe(404);
    expect((await prisma.restaurante.findUniqueOrThrow({ where: { id: A } })).sessionTimeoutMinutos).toBe(480);
  });

  it('RBAC: COLLABORATOR não altera o próprio nem o restaurante', async () => {
    const t = tok(colA, 'COLLABORATOR', A);
    expect((await putUser(t, colA, { sessionTimeoutMinutos: 10 })).status).toBe(403);
    expect((await putRest(t, A, { sessionTimeoutMinutos: 10 })).status).toBe(403);
  });

  it('SUPER_ADMIN com tenant explícito', async () => {
    const t = tok(supA, 'SUPER_ADMIN', null);
    expect((await putUser(t, colA, { sessionTimeoutMinutos: 20 }, `?restauranteId=${A}`)).status).toBe(200);
    expect((await putUser(t, colA, { sessionTimeoutMinutos: 20 }, `?restauranteId=${B}`)).status).toBe(404);
    expect((await putUser(t, colA, { sessionTimeoutMinutos: 20 })).status).toBe(400);
    expect((await putRest(t, B, { sessionTimeoutMinutos: 45 })).status).toBe(200);
  });
});
