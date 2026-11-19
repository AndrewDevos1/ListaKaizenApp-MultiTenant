import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';

// PostgreSQL real descartável (URL deve conter _test). Pulada sem TEST_DATABASE_URL.
const url = process.env.TEST_DATABASE_URL;
const d = url && /_test/.test(url) ? describe : describe.skip;
jest.setTimeout(120000);

d('entrega física + custódia + aceite eletrônico (HTTP + PostgreSQL real)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let A: number, B: number;
  const ids: Record<string, number> = {};
  const tk: Record<string, string> = {};
  let seq = 0;
  const key = () => `k-${Date.now()}-${++seq}`;
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const http = () => request(app.getHttpServer());

  async function posicao(restauranteId: number, saldo: number, retornavel = false) {
    const m = await prisma.materialAlmoxarifado.create({ data: { restauranteId, nome: `Mat-${Date.now()}-${++seq}`, categoria: 'EPI', retornavel, valorReferencia: 1 } });
    return prisma.posicaoMaterialAlmoxarifado.create({ data: { restauranteId, materialId: m.id, saldo } });
  }
  async function entrega(posicoes: { id: number; q: number }[], token = tk.adminA) {
    const res = await http().post('/api/v1/admin/entregas-epi').set(auth(token)).send({ funcionarioId: ids.colabA, chaveIdempotencia: key(), itens: posicoes.map((p) => ({ posicaoId: p.id, quantidade: p.q })) }).expect(201);
    return res.body.id as number;
  }
  const fisica = (id: number, k = key(), token = tk.adminA) => http().post(`/api/v1/admin/entregas-epi/${id}/confirmar-entrega-fisica`).set(auth(token)).set('Idempotency-Key', k);
  const aceitar = (id: number) => http().post(`/api/v1/collaborator/entregas-epi/${id}/aceitar`).set(auth(tk.colabA)).send({ chaveIdempotencia: key() });
  const recusar = (id: number) => http().post(`/api/v1/collaborator/entregas-epi/${id}/recusar`).set(auth(tk.colabA)).send({ chaveIdempotencia: key(), justificativa: 'não recebi' });
  const cancelar = (id: number) => http().post(`/api/v1/admin/entregas-epi/${id}/cancelar`).set(auth(tk.adminA)).send({ chaveIdempotencia: key() });
  const saldo = async (id: number) => Number((await prisma.posicaoMaterialAlmoxarifado.findUniqueOrThrow({ where: { id } })).saldo);
  const movs = (posicaoId: number) => prisma.movimentoMaterialAlmoxarifado.count({ where: { posicaoId } });
  const tipos = async (id: number) => (await prisma.entregaEpiEvento.findMany({ where: { entregaId: id }, orderBy: { id: 'asc' } })).map((e) => e.tipo);

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    process.env.JWT_SECRET = 'int-test-secret';
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
    const sfx = Date.now();
    A = (await prisma.restaurante.create({ data: { nome: `EA${sfx}` } })).id;
    B = (await prisma.restaurante.create({ data: { nome: `EB${sfx}` } })).id;
    const mk = async (k: string, role: any, rid: number) => {
      ids[k] = (await prisma.usuario.create({ data: { nome: k, email: `${k}${sfx}@t.io`, senha: 'x', role, aprovado: true, restauranteId: rid } })).id;
      tk[k] = jwt.sign({ sub: ids[k], email: `${k}@t.io`, role, restauranteId: rid });
    };
    await mk('adminA', 'ADMIN', A); await mk('adminB', 'ADMIN', B); await mk('colabA', 'COLLABORATOR', A); await mk('outroColabA', 'COLLABORATOR', A); await mk('superAdmin', 'SUPER_ADMIN' as any, A); await mk('contador', 'CONTADOR' as any, A);
    await prisma.contadorRestaurante.create({ data: { contadorId: ids.contador, restauranteId: A } });
  });
  afterAll(async () => { await app?.close(); });

  it('entrega física baixa saldo, cria movimento SAIDA, custódia e evento; criação não baixa saldo', async () => {
    const p = await posicao(A, 10, true);
    const id = await entrega([{ id: p.id, q: 3 }]);
    expect(await saldo(p.id)).toBe(10);
    expect(await tipos(id)).toEqual(['CRIADA']);
    const res = await fisica(id).expect(201);
    expect(res.body).toMatchObject({ statusFisico: 'ENTREGUE', entreguePorId: ids.adminA });
    expect(res.body.entregueFisicamenteEm).toBeTruthy();
    expect(await saldo(p.id)).toBe(7);
    const mv = await prisma.movimentoMaterialAlmoxarifado.findFirstOrThrow({ where: { posicaoId: p.id } });
    expect(mv).toMatchObject({ tipo: 'SAIDA', responsavelId: ids.adminA });
    expect(Number(mv.saldoAnterior)).toBe(10); expect(Number(mv.saldoNovo)).toBe(7);
    const [c] = await prisma.custodiaEpiItem.findMany({ where: { entregaId: id } });
    expect(c).toMatchObject({ funcionarioId: ids.colabA, restauranteId: A, retornavel: true });
    expect(Number(c.quantidadeEmPosse)).toBe(3); expect(c.iniciadaEm).toBeInstanceOf(Date);
    expect(await tipos(id)).toEqual(['CRIADA', 'ENTREGA_FISICA_CONFIRMADA']);
  });

  it('saldo insuficiente: 400 sem escrita alguma (rollback entre itens)', async () => {
    const ok = await posicao(A, 5); const curto = await posicao(A, 1);
    const id = await entrega([{ id: ok.id, q: 2 }, { id: curto.id, q: 2 }]);
    await fisica(id).expect(400);
    expect(await saldo(ok.id)).toBe(5); expect(await saldo(curto.id)).toBe(1);
    expect(await movs(ok.id)).toBe(0);
    expect(await prisma.custodiaEpiItem.count({ where: { entregaId: id } })).toBe(0);
    expect(await tipos(id)).toEqual(['CRIADA']);
    expect((await prisma.entregaEpi.findUniqueOrThrow({ where: { id } })).statusFisico).toBe('PREPARADA');
  });

  it('corrida de duas entregas sobre o mesmo saldo: só uma vence, saldo nunca negativo', async () => {
    const p = await posicao(A, 5);
    const e1 = await entrega([{ id: p.id, q: 4 }]); const e2 = await entrega([{ id: p.id, q: 4 }]);
    const r = await Promise.all([fisica(e1), fisica(e2)]);
    expect(r.map((x) => x.status).sort()).toEqual([201, 400]);
    expect(await saldo(p.id)).toBe(1);
    expect(await movs(p.id)).toBe(1);
  });

  it('idempotência: mesma chave repete; chave diferente retorna 409 sem duplicar efeitos', async () => {
    const p = await posicao(A, 10);
    const id = await entrega([{ id: p.id, q: 2 }]);
    const k = key();
    await fisica(id, k).expect(201);
    await fisica(id, k).expect(201);
    await fisica(id, key()).expect(409);
    expect(await saldo(p.id)).toBe(8);
    expect(await movs(p.id)).toBe(1);
    expect(await prisma.custodiaEpiItem.count({ where: { entregaId: id } })).toBe(1);
    expect((await tipos(id)).filter((t) => t === 'ENTREGA_FISICA_CONFIRMADA')).toHaveLength(1);
  });

  it('corrida da mesma chave: uma confirmação efetiva, demais respostas idempotentes', async () => {
    const p = await posicao(A, 10);
    const id = await entrega([{ id: p.id, q: 2 }]);
    const k = key();
    const r = await Promise.all([fisica(id, k), fisica(id, k), fisica(id, k)]);
    expect(r.map((x) => x.status)).toEqual([201, 201, 201]);
    expect(await saldo(p.id)).toBe(8);
    expect(await movs(p.id)).toBe(1);
    expect(await prisma.custodiaEpiItem.count({ where: { entregaId: id } })).toBe(1);
    expect((await tipos(id)).filter((t) => t === 'ENTREGA_FISICA_CONFIRMADA')).toHaveLength(1);
  });

  it('exige Idempotency-Key', async () => {
    const p = await posicao(A, 1); const id = await entrega([{ id: p.id, q: 1 }]);
    await http().post(`/api/v1/admin/entregas-epi/${id}/confirmar-entrega-fisica`).set(auth(tk.adminA)).expect(400);
  });

  it('aceite eletrônico antes da física retorna 409 sem alterar estado ou trilha', async () => {
    const p = await posicao(A, 4);
    const id = await entrega([{ id: p.id, q: 1 }]);
    await aceitar(id).expect(409);
    expect(await saldo(p.id)).toBe(4);
    expect(await prisma.custodiaEpiItem.count({ where: { entregaId: id } })).toBe(0);
    expect(await prisma.entregaEpi.findUniqueOrThrow({ where: { id } })).toMatchObject({ status: 'PENDENTE', statusAceite: 'PENDENTE', statusFisico: 'PREPARADA' });
    expect(await tipos(id)).toEqual(['CRIADA']);
  });

  it('recusa eletrônica antes da física retorna 409 sem alterar estado ou trilha', async () => {
    const p = await posicao(A, 4);
    const id = await entrega([{ id: p.id, q: 1 }]);
    await recusar(id).expect(409);
    expect(await saldo(p.id)).toBe(4);
    expect(await prisma.custodiaEpiItem.count({ where: { entregaId: id } })).toBe(0);
    expect(await prisma.entregaEpi.findUniqueOrThrow({ where: { id } })).toMatchObject({ status: 'PENDENTE', statusAceite: 'PENDENTE', statusFisico: 'PREPARADA' });
    expect(await tipos(id)).toEqual(['CRIADA']);
  });

  it('aceite após física não altera saldo/custódia; custódia existe com aceite PENDENTE', async () => {
    const p = await posicao(A, 4);
    const id = await entrega([{ id: p.id, q: 1 }]);
    await fisica(id).expect(201);
    const antes = await prisma.custodiaEpiItem.findMany({ where: { entregaId: id } });
    expect(antes).toHaveLength(1);
    expect((await prisma.entregaEpi.findUniqueOrThrow({ where: { id } })).statusAceite).toBe('PENDENTE');
    await aceitar(id).expect(201);
    expect(await saldo(p.id)).toBe(3); expect(await movs(p.id)).toBe(1);
    expect(await prisma.custodiaEpiItem.findMany({ where: { entregaId: id } })).toEqual(antes);
  });

  it('recusa DEPOIS da física: DIVERGENCIA registrada, custódia e saldo intactos, sem devolução fictícia', async () => {
    const p = await posicao(A, 4);
    const id = await entrega([{ id: p.id, q: 2 }]);
    await fisica(id).expect(201);
    await recusar(id).expect(201);
    expect(await saldo(p.id)).toBe(2); expect(await movs(p.id)).toBe(1);
    expect(await prisma.custodiaEpiItem.count({ where: { entregaId: id } })).toBe(1);
    expect(await tipos(id)).toEqual(['CRIADA', 'ENTREGA_FISICA_CONFIRMADA', 'RECUSA', 'DIVERGENCIA']);
  });

  it('cancelamento antes da física: NAO_ENTREGUE, sem movimento, e física posterior => 409', async () => {
    const p = await posicao(A, 4);
    const id = await entrega([{ id: p.id, q: 1 }]);
    const c = await cancelar(id).expect(201);
    expect(c.body).toMatchObject({ status: 'CANCELADO', statusFisico: 'NAO_ENTREGUE' });
    expect(await movs(p.id)).toBe(0);
    expect(await tipos(id)).toEqual(['CRIADA', 'CANCELADA']);
    await fisica(id).expect(409);
    expect(await saldo(p.id)).toBe(4);
  });

  it('cancelamento depois da física => 409 e nada muda', async () => {
    const p = await posicao(A, 4);
    const id = await entrega([{ id: p.id, q: 1 }]);
    await fisica(id).expect(201);
    await cancelar(id).expect(409);
    expect((await prisma.entregaEpi.findUniqueOrThrow({ where: { id } })).statusFisico).toBe('ENTREGUE');
    expect(await tipos(id)).toEqual(['CRIADA', 'ENTREGA_FISICA_CONFIRMADA']);
  });

  it('RBAC e tenant: colaborador 403; admin B 404 sem efeito; outro colaborador não aceita', async () => {
    const p = await posicao(A, 4);
    const id = await entrega([{ id: p.id, q: 1 }]);
    await fisica(id, key(), tk.colabA).expect(403);
    await fisica(id, key(), tk.adminB).expect(404);
    await http().post(`/api/v1/collaborator/entregas-epi/${id}/aceitar`).set(auth(tk.outroColabA)).send({ chaveIdempotencia: key() }).expect(404);
    expect(await saldo(p.id)).toBe(4);
    await http().get(`/api/v1/admin/entregas-epi/${id}`).set(auth(tk.adminB)).expect(404);
  });

  it('flag desligada => 403 na confirmação', async () => {
    const p = await posicao(A, 4);
    const id = await entrega([{ id: p.id, q: 1 }]);
    await prisma.restaurante.update({ where: { id: A }, data: { moduloAlmoxarifadoEpi: false } });
    try { await fisica(id).expect(403); } finally { await prisma.restaurante.update({ where: { id: A }, data: { moduloAlmoxarifadoEpi: true } }); }
    expect(await saldo(p.id)).toBe(4);
  });

  it('trilha é append-only no banco: UPDATE e DELETE bloqueados', async () => {
    const p = await posicao(A, 4);
    const id = await entrega([{ id: p.id, q: 1 }]);
    await expect(prisma.entregaEpiEvento.updateMany({ where: { entregaId: id }, data: { tipo: 'CANCELADA' } })).rejects.toThrow(/append-only/);
    await expect(prisma.entregaEpiEvento.deleteMany({ where: { entregaId: id } })).rejects.toThrow(/append-only/);
    expect(await tipos(id)).toEqual(['CRIADA']);
  });

  it('rollback: falha ao gravar custódia desfaz saldo, movimento e evento', async () => {
    const p = await posicao(A, 4);
    const id = await entrega([{ id: p.id, q: 1 }]);
    const item = await prisma.entregaEpiItem.findFirstOrThrow({ where: { entregaId: id } });
    // pré-existência de custódia viola UNIQUE(entrega_item_id) dentro da transação
    await prisma.custodiaEpiItem.create({ data: { restauranteId: A, entregaId: id, entregaItemId: item.id, funcionarioId: ids.colabA, materialId: item.materialId, quantidadeEmPosse: 1, retornavel: false, iniciadaEm: new Date() } });
    await fisica(id).expect((r) => expect(r.status).toBeGreaterThanOrEqual(500));
    expect(await saldo(p.id)).toBe(4); expect(await movs(p.id)).toBe(0);
    expect(await tipos(id)).toEqual(['CRIADA']);
    expect((await prisma.entregaEpi.findUniqueOrThrow({ where: { id } })).statusFisico).toBe('PREPARADA');
  });

  const payload = (p: number, extra: any = {}) => ({ funcionarioId: ids.colabA, itens: [{ posicaoId: p, quantidade: 1 }], ...extra });
  const criarRaw = (body: any, token = tk.adminA, qs = '') => http().post(`/api/v1/admin/entregas-epi${qs}`).set(auth(token)).send(body);

  it('criação: mesma chave e payload canônico (itens em outra ordem, observação com espaços) retorna original; payload diferente => 409', async () => {
    const p1 = await posicao(A, 5); const p2 = await posicao(A, 5); const k = key();
    const body = { funcionarioId: ids.colabA, chaveIdempotencia: k, observacoes: ' uso   imediato ', itens: [{ posicaoId: p1.id, quantidade: 1 }, { posicaoId: p2.id, quantidade: 2 }] };
    const a = await criarRaw(body).expect(201);
    const b = await criarRaw({ ...body, observacoes: 'uso imediato', itens: [...body.itens].reverse() }).expect((r) => expect([200, 201]).toContain(r.status));
    expect(b.body.id).toBe(a.body.id);
    await criarRaw({ ...body, itens: [{ posicaoId: p1.id, quantidade: 3 }, { posicaoId: p2.id, quantidade: 2 }] }).expect(409);
    await criarRaw({ ...body, observacoes: 'outra' }).expect(409);
    expect(await prisma.entregaEpi.count({ where: { restauranteId: A, chaveIdempotencia: k } })).toBe(1);
    expect(await tipos(a.body.id)).toEqual(['CRIADA']);
  });

  it('criação: posicaoId duplicada => 400', async () => {
    const p = await posicao(A, 5);
    await criarRaw({ funcionarioId: ids.colabA, chaveIdempotencia: key(), itens: [{ posicaoId: p.id, quantidade: 1 }, { posicaoId: p.id, quantidade: 2 }] }).expect(400);
  });

  it('transição: retry idêntico retorna original sem novo evento; chave diferente 409; mesma chave payload diferente 409', async () => {
    const p = await posicao(A, 5); const id = await entrega([{ id: p.id, q: 1 }]); await fisica(id); const k = key();
    const go = (kk: string, rota = 'aceitar', body: any = {}) => http().post(`/api/v1/collaborator/entregas-epi/${id}/${rota}`).set(auth(tk.colabA)).send({ chaveIdempotencia: kk, ...body });
    await go(k).expect(201);
    await go(k).expect((r) => expect([200, 201]).toContain(r.status));
    expect(await tipos(id)).toEqual(['CRIADA', 'ENTREGA_FISICA_CONFIRMADA', 'ACEITE_ELETRONICO']);
    await go(key()).expect(409);
    await go(k, 'recusar', { justificativa: 'x' }).expect(409);
    await go('   ').expect(400);
    expect(await tipos(id)).toEqual(['CRIADA', 'ENTREGA_FISICA_CONFIRMADA', 'ACEITE_ELETRONICO']);
  });

  it('transição: corrida com mesma chave => um evento, todos retornam o resultado original', async () => {
    const p = await posicao(A, 5); const id = await entrega([{ id: p.id, q: 1 }]); await fisica(id); const k = key();
    const rs = await Promise.all(Array.from({ length: 5 }, () => http().post(`/api/v1/collaborator/entregas-epi/${id}/aceitar`).set(auth(tk.colabA)).send({ chaveIdempotencia: k })));
    expect(rs.map((r) => r.status).every((s) => [200, 201].includes(s))).toBe(true);
    expect(await tipos(id)).toEqual(['CRIADA', 'ENTREGA_FISICA_CONFIRMADA', 'ACEITE_ELETRONICO']);
  });

  it('cancelamento: chave obrigatória; retry idêntico ok; chave diferente 409', async () => {
    const p = await posicao(A, 5); const id = await entrega([{ id: p.id, q: 1 }]); const k = key();
    const go = (body: any) => http().post(`/api/v1/admin/entregas-epi/${id}/cancelar`).set(auth(tk.adminA)).send(body);
    await go({}).expect(400);
    await go({ chaveIdempotencia: k }).expect(201);
    await go({ chaveIdempotencia: k }).expect((r) => expect([200, 201]).toContain(r.status));
    await go({ chaveIdempotencia: key() }).expect(409);
    expect(await tipos(id)).toEqual(['CRIADA', 'CANCELADA']);
  });

  it('módulo/tenant: SUPER_ADMIN exige restauranteId e respeita flag; CONTADOR e ADMIN preservados', async () => {
    const p = await posicao(A, 5);
    const body = (k = key()) => ({ ...payload(p.id), chaveIdempotencia: k });
    await criarRaw(body(), tk.superAdmin).expect(400);
    await criarRaw(body(), tk.superAdmin, `?restauranteId=${A}`).expect(201);
    await prisma.restaurante.update({ where: { id: A }, data: { moduloAlmoxarifadoEpi: false } });
    try {
      await criarRaw(body(), tk.superAdmin, `?restauranteId=${A}`).expect(403);
      await criarRaw(body(), tk.adminA).expect(403);
    } finally { await prisma.restaurante.update({ where: { id: A }, data: { moduloAlmoxarifadoEpi: true } }); }
    await http().get(`/api/v1/admin/entregas-epi?restauranteId=${A}`).set(auth(tk.contador)).expect(403); // role não permitida na rota
    await http().get('/api/v1/admin/entregas-epi').set(auth(tk.adminA)).expect(200);
  });
});
