import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';

// Integração HTTP + PostgreSQL real. Banco descartável: nome deve conter _test.
const url = process.env.TEST_DATABASE_URL;
const d = url && /_test/.test(url) ? describe : describe.skip;

d('Almoxarifado (PostgreSQL real)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  const tag = `alm${Date.now()}`;
  let rA: number, rB: number, rOff: number;
  let itemA: number, itemB: number, itemOff: number;
  const tok: Record<string, string> = {};
  const api = (t: string, m: 'get' | 'post' | 'put', path: string) => (request(app.getHttpServer()) as any)[m](`/v1/admin/almoxarifado${path}`).set('Authorization', `Bearer ${tok[t]}`);
  const mov = (t: string, id: number, tipo: string, quantidade: number, chave: string, q = '') => api(t, 'post', `/${id}/movimentacoes${q}`).send({ tipo, quantidade, motivo: 'teste', chaveIdempotencia: chave });
  const posicao = async (t: string, itemId: number, minimo?: number) => (await api(t, 'post', '').send({ itemId, ...(minimo === undefined ? {} : { minimo }) })).body.id as number;

  const mkUser = async (role: any, restauranteId: number | null, n: string) => {
    const u = await prisma.usuario.create({ data: { nome: n, email: `${tag}.${n}@t.local`, senha: 'x', role, aprovado: true, restauranteId } });
    tok[n] = jwt.sign({ sub: u.id, email: u.email, role, restauranteId });
    return u;
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    process.env.JWT_SECRET ??= 'test-secret';
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
    rA = (await prisma.restaurante.create({ data: { nome: `${tag}A` } })).id;
    rB = (await prisma.restaurante.create({ data: { nome: `${tag}B` } })).id;
    rOff = (await prisma.restaurante.create({ data: { nome: `${tag}Off`, moduloAlmoxarifadoEpi: false } })).id;
    const mkItem = async (restauranteId: number, nome: string) => (await prisma.item.create({ data: { nome, unidadeMedida: 'un', restauranteId } })).id;
    itemA = await mkItem(rA, `${tag}-ia`);
    itemB = await mkItem(rB, `${tag}-ib`);
    itemOff = await mkItem(rOff, `${tag}-io`);
    await mkUser('ADMIN', rA, 'adminA');
    await mkUser('ADMIN', rB, 'adminB');
    await mkUser('ADMIN', rOff, 'adminOff');
    await mkUser('SUPER_ADMIN', null, 'super');
    await mkUser('COLLABORATOR', rA, 'colab');
    await mkUser('CONTADOR', rA, 'contador');
    await mkUser('SUPPLIER', rA, 'supplier');
  });
  afterAll(async () => { await app?.close(); });

  it('RBAC: COLLABORATOR/CONTADOR/SUPPLIER recebem 403', async () => {
    for (const t of ['colab', 'contador', 'supplier']) {
      const res = await api(t, 'get', t === 'contador' ? `?restauranteId=${rA}` : '');
      expect(res.status).toBe(403);
    }
  });

  it('SUPER_ADMIN sem restauranteId => 400; com restauranteId => 200', async () => {
    expect((await api('super', 'get', '')).status).toBe(400);
    expect((await api('super', 'get', `?restauranteId=${rA}`)).status).toBe(200);
  });

  it('TenantId global intacto (não lança 400 para SUPER_ADMIN sem restauranteId)', () => {
    const src = require('fs').readFileSync(require.resolve('../../common/decorators/tenant-id.decorator'), 'utf8');
    expect(src).not.toContain('SUPER_ADMIN deve');
  });

  it('flag desligada => 403', async () => {
    expect((await api('adminOff', 'get', '')).status).toBe(403);
  });

  it('isolamento A/B: item de outro tenant 404; posição e movimentação invisíveis', async () => {
    expect((await api('adminA', 'post', '').send({ itemId: itemB })).status).toBe(404);
    const pB = await posicao('adminB', itemB);
    expect((await api('adminA', 'get', `/${pB}`)).status).toBe(404);
    expect((await mov('adminA', pB, 'ENTRADA', 1, `${tag}-iso`)).status).toBe(404);
    const lista = await api('adminA', 'get', '');
    expect(lista.body.map((p: any) => p.id)).not.toContain(pB);
  });

  it('saldo único por item/restaurante (409), entrada/saída/ajuste com saldo anterior/novo', async () => {
    const p = await posicao('adminA', itemA, 10);
    expect((await api('adminA', 'post', '').send({ itemId: itemA })).status).toBe(409);
    expect((await mov('adminA', p, 'ENTRADA', 5, `${tag}-e1`)).body).toMatchObject({ saldoAnterior: '0', saldoNovo: '5', tipo: 'ENTRADA', responsavelNome: 'adminA' });
    expect((await mov('adminA', p, 'SAIDA', 2, `${tag}-s1`)).body).toMatchObject({ saldoAnterior: '5', saldoNovo: '3' });
    expect((await mov('adminA', p, 'AJUSTE', 20, `${tag}-a1`)).body).toMatchObject({ saldoAnterior: '3', saldoNovo: '20' });
    const det = await api('adminA', 'get', `/${p}`);
    expect(det.body.saldo).toBe('20');
    expect(det.body.movimentacoes).toHaveLength(3);
    // validação: quantidade <=0 e motivo vazio
    expect((await mov('adminA', p, 'ENTRADA', 0, `${tag}-z`)).status).toBe(400);
    expect((await api('adminA', 'post', `/${p}/movimentacoes`).send({ tipo: 'ENTRADA', quantidade: 1, motivo: '', chaveIdempotencia: `${tag}-m` })).status).toBe(400);
  });

  it('saldo negativo proibido: 400 sem escrita', async () => {
    const it = (await prisma.item.create({ data: { nome: `${tag}-neg`, unidadeMedida: 'un', restauranteId: rA } })).id;
    const p = await posicao('adminA', it);
    await mov('adminA', p, 'ENTRADA', 3, `${tag}-n1`);
    const res = await mov('adminA', p, 'SAIDA', 4, `${tag}-n2`);
    expect(res.status).toBe(400);
    expect((await prisma.almoxarifadoPosicao.findUnique({ where: { id: p } }))!.saldo.toString()).toBe('3');
    expect(await prisma.almoxarifadoMovimentacao.count({ where: { posicaoId: p } })).toBe(1);
    expect(await prisma.almoxarifadoMovimentacao.count({ where: { chaveIdempotencia: `${tag}-n2` } })).toBe(0);
  });

  it('concorrência: 12 saídas paralelas sobre saldo 5 => exatamente 5 ok, 7 rejeitadas, saldo 0', async () => {
    const it = (await prisma.item.create({ data: { nome: `${tag}-conc`, unidadeMedida: 'un', restauranteId: rA } })).id;
    const p = await posicao('adminA', it);
    await mov('adminA', p, 'ENTRADA', 5, `${tag}-c0`);
    const res = await Promise.all(Array.from({ length: 12 }, (_, i) => mov('adminA', p, 'SAIDA', 1, `${tag}-c${i + 1}`)));
    const codes = res.map((r) => r.status);
    expect(codes.filter((c) => c === 201)).toHaveLength(5);
    expect(codes.filter((c) => c === 400)).toHaveLength(7);
    expect((await prisma.almoxarifadoPosicao.findUnique({ where: { id: p } }))!.saldo.toString()).toBe('0');
    const movs = await prisma.almoxarifadoMovimentacao.findMany({ where: { posicaoId: p }, orderBy: { id: 'asc' } });
    expect(movs).toHaveLength(6);
    movs.slice(1).forEach((m, i) => expect(m.saldoNovo.toString()).toBe(String(4 - i))); // cadeia sem lacunas
  });

  it('idempotência: mesma chave (sequencial e paralela) aplica uma única vez', async () => {
    const it = (await prisma.item.create({ data: { nome: `${tag}-idem`, unidadeMedida: 'un', restauranteId: rA } })).id;
    const p = await posicao('adminA', it);
    const res = await Promise.all(Array.from({ length: 6 }, () => mov('adminA', p, 'ENTRADA', 7, `${tag}-same`)));
    res.forEach((r) => expect(r.status).toBe(201));
    expect(new Set(res.map((r) => r.body.id)).size).toBe(1);
    expect((await mov('adminA', p, 'ENTRADA', 7, `${tag}-same`)).body.id).toBe(res[0].body.id);
    expect((await prisma.almoxarifadoPosicao.findUnique({ where: { id: p } }))!.saldo.toString()).toBe('7');
    // mesma chave em outro restaurante é independente
    const pB = await posicao('adminB', (await prisma.item.create({ data: { nome: `${tag}-idemB`, unidadeMedida: 'un', restauranteId: rB } })).id);
    expect((await mov('adminB', pB, 'ENTRADA', 1, `${tag}-same`)).status).toBe(201);
  });

  it('append-only: trigger bloqueia UPDATE e DELETE no banco', async () => {
    const m = await prisma.almoxarifadoMovimentacao.findFirstOrThrow({ where: { restauranteId: rA } });
    await expect(prisma.$executeRaw`UPDATE almoxarifado_movimentacoes SET motivo='x' WHERE id=${m.id}`).rejects.toThrow(/append-only/);
    await expect(prisma.$executeRaw`DELETE FROM almoxarifado_movimentacoes WHERE id=${m.id}`).rejects.toThrow(/append-only/);
  });

  it('CHECK no banco: saldo negativo direto é rejeitado', async () => {
    const p = await prisma.almoxarifadoPosicao.findFirstOrThrow({ where: { restauranteId: rA } });
    await expect(prisma.$executeRaw`UPDATE almoxarifado_posicoes SET saldo=-1 WHERE id=${p.id}`).rejects.toThrow();
  });

  it('inativar em vez de excluir; inativa não movimenta; filtro ativo e busca', async () => {
    const it = (await prisma.item.create({ data: { nome: `${tag}-inat`, unidadeMedida: 'un', restauranteId: rA } })).id;
    const p = await posicao('adminA', it, 2);
    await mov('adminA', p, 'ENTRADA', 1, `${tag}-i1`);
    expect((await api('adminA', 'put', `/${p}`).send({ ativo: false })).body.ativo).toBe(false);
    expect((await mov('adminA', p, 'ENTRADA', 1, `${tag}-i2`)).status).toBe(400);
    const inativos = await api('adminA', 'get', '?ativo=false&busca=inat');
    expect(inativos.body.map((x: any) => x.id)).toEqual([p]);
    expect((await request(app.getHttpServer()).delete(`/v1/admin/almoxarifado/${p}`).set('Authorization', `Bearer ${tok.adminA}`)).status).toBe(404);
  });

  it('movimentar NÃO altera ListaItemRef/Pedido/Recebimento/Cotacao', async () => {
    const lista = await prisma.lista.create({ data: { nome: `${tag}-l`, restauranteId: rA } as any });
    await prisma.listaItemRef.create({ data: { listaId: lista.id, itemId: (await prisma.item.create({ data: { nome: `${tag}-lr`, unidadeMedida: 'un', restauranteId: rA } })).id, quantidadeAtual: 4, quantidadeMinima: 1 } });
    const snap = async () => JSON.stringify([
      await prisma.listaItemRef.findMany({ where: { lista: { restauranteId: rA } }, orderBy: { id: 'asc' } }),
      await prisma.pedido.findMany({ where: { item: { restauranteId: rA } } }),
      await prisma.recebimento.count({ where: { restauranteId: rA } }),
      await prisma.cotacao.count({ where: { restauranteId: rA } }),
    ]);
    const before = await snap();
    const it = (await prisma.item.findFirstOrThrow({ where: { nome: `${tag}-lr` } })).id;
    const p = await posicao('adminA', it);
    await mov('adminA', p, 'ENTRADA', 9, `${tag}-r1`);
    await mov('adminA', p, 'SAIDA', 3, `${tag}-r2`);
    await mov('adminA', p, 'AJUSTE', 1, `${tag}-r3`);
    expect(await snap()).toBe(before);
  });
});
