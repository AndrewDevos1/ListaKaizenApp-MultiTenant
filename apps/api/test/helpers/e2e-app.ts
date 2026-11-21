import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import * as request from 'supertest';
import { isDisposableTestDatabaseUrl } from '../disposable-test-db';

// Helpers das baterias E2E por código (API real + PostgreSQL descartável).
// Nunca toca em banco que não seja local e terminado em _test/_testN.
jest.setTimeout(120_000);
export const SENHA = 'admin123';
export const SFX = Date.now().toString(36); // fixado antes de qualquer relógio falso
export const dbDisponivel = isDisposableTestDatabaseUrl(process.env.TEST_DATABASE_URL);
if (!dbDisponivel && process.env.REQUIRE_DB_INTEGRATION === '1') {
  throw new Error('REQUIRE_DB_INTEGRATION=1 exige TEST_DATABASE_URL local terminado em _test/_testN');
}
export const describeDb = dbDisponivel ? describe : describe.skip;

export async function bootApp() {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL!;
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-secret';
  process.env.JWT_EXPIRATION = '3650d'; // relógio controlado atravessa semanas
  const { AppModule } = await import('../../src/app.module');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app: INestApplication = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.setGlobalPrefix('api');
  await app.listen(0, '127.0.0.1'); // listener único: evita porta efêmera por requisição (ECONNRESET/EADDRINUSE no WSL)
  const prisma = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL! } } });
  await prisma.$connect();
  const [{ db }] = await prisma.$queryRaw<{ db: string }[]>`SELECT current_database() AS db`;
  if (!/_test\d*$/.test(db)) throw new Error(`Banco ${db} não é descartável`);
  return { app, prisma };
}

export const api = (app: INestApplication) => request(app.getHttpServer());
export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function mkTenant(prisma: PrismaClient, nome: string, flags: Record<string, boolean> = {}) {
  return prisma.restaurante.create({
    data: { nome: `${nome}-${SFX}`, moduloPonto: true, moduloFuncionarios: true, ...flags },
  });
}

export async function mkUser(
  prisma: PrismaClient,
  nome: string,
  role: UserRole,
  restauranteId: number | null,
  extra: Record<string, unknown> = {},
) {
  return prisma.usuario.create({
    data: {
      nome,
      email: `${nome.toLowerCase().replace(/\W+/g, '.')}.${SFX}@e2e.kaizen.test`,
      senha: await bcrypt.hash(SENHA, 4),
      role,
      aprovado: true,
      ativo: true,
      restauranteId,
      ...extra,
    },
  });
}

export async function login(app: INestApplication, email: string) {
  const res = await api(app).post('/api/v1/auth/login').send({ email, senha: SENHA }).expect(201);
  expect(res.body.accessToken).toBeTruthy();
  return res.body.accessToken as string;
}

const SO_DATE = [
  'hrtime', 'nextTick', 'performance', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame',
  'requestIdleCallback', 'cancelIdleCallback', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval',
  'setTimeout', 'clearTimeout',
] as const;

// Relógio controlado: só Date é falso; timers reais mantêm HTTP/Prisma funcionando. Não altera o relógio do SO.
export function relogio(iso: string) {
  jest.useFakeTimers({ now: new Date(iso), doNotFake: [...SO_DATE] });
}
export const mover = (iso: string) => jest.setSystemTime(new Date(iso));

type Linha = { jornada: string; acao: string; http: string; efeito: string; resultado: 'PASS' | 'FAIL'; erro?: string };

export function reporter(nome: string, titulo: string) {
  const linhas: Linha[] = [];
  return {
    // fn executa a ação real, faz as asserções (API + banco) e devolve o HTTP e o efeito verificado.
    async step(jornada: string, acao: string, fn: () => Promise<{ http: number | string; efeito: string }>) {
      try {
        const { http, efeito } = await fn();
        linhas.push({ jornada, acao, http: String(http), efeito, resultado: 'PASS' });
      } catch (e) {
        linhas.push({ jornada, acao, http: '-', efeito: '-', resultado: 'FAIL', erro: String((e as Error).message).split('\n')[0] });
        throw e;
      }
    },
    flush() {
      const dir = process.env.E2E_REPORT_DIR;
      if (!dir) return;
      mkdirSync(dir, { recursive: true });
      const esc = (s: string) => s.replace(/\|/g, '\\|');
      const total = linhas.length;
      const pass = linhas.filter((l) => l.resultado === 'PASS').length;
      const md = [
        `# ${titulo}`,
        '',
        `Passos verificados: ${pass}/${total} PASS. Banco: PostgreSQL descartável (_test). Cada passo confere resposta da API, estado persistido e permissões.`,
        '',
        '| Jornada | Ação | HTTP | Efeito verificado | Resultado |',
        '|---|---|---|---|---|',
        ...linhas.map((l) => `| ${esc(l.jornada)} | ${esc(l.acao)} | ${l.http} | ${esc(l.efeito)}${l.erro ? ` — ${esc(l.erro)}` : ''} | ${l.resultado} |`),
        '',
      ].join('\n');
      writeFileSync(join(dir, `${nome}.md`), md);
    },
  };
}
