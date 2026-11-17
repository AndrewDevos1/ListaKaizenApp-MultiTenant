import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';
import { parseDecimalPtBr } from './catalogo-parser';

// Integração HTTP + PostgreSQL real descartável (nome deve conter _test). Pulada sem TEST_DATABASE_URL.
const url = process.env.TEST_DATABASE_URL;
const d = url && /_test/.test(url) ? describe : describe.skip;
jest.setTimeout(120000);

d('catálogo por fornecedor (HTTP + PostgreSQL real)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  const ids: Record<string, number> = {};
  const tok = (k: string, role: string, rid: number | null) => jwt.sign({ sub: ids[k], email: `${k}@t.io`, role, restauranteId: rid });
  let A: number, B: number, fA: number, fB: number, tA: string, tB: string, tSuper: string, tColab: string, tContador: string, tSupplier: string;
  const base = (f: number) => `/api/v1/admin/fornecedores/${f}/itens`;
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const count = (fornecedorId: number) => prisma.item.count({ where: { fornecedorId } });

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
    A = (await prisma.restaurante.create({ data: { nome: `A${sfx}` } })).id;
    B = (await prisma.restaurante.create({ data: { nome: `B${sfx}` } })).id;
    fA = (await prisma.fornecedor.create({ data: { nome: 'FA', restauranteId: A } })).id;
    fB = (await prisma.fornecedor.create({ data: { nome: 'FB', restauranteId: B } })).id;
    const mk = async (k: string, role: any, rid: number | null) => {
      ids[k] = (await prisma.usuario.create({ data: { nome: k, email: `${k}${sfx}@t.io`, senha: 'x', role, aprovado: true, restauranteId: rid } })).id;
    };
    await mk('adminA', 'ADMIN', A); await mk('adminB', 'ADMIN', B); await mk('super', 'SUPER_ADMIN', null);
    await mk('colab', 'COLLABORATOR', A); await mk('contador', 'CONTADOR', null); await mk('supplier', 'SUPPLIER', A);
    tA = tok('adminA', 'ADMIN', A); tB = tok('adminB', 'ADMIN', B); tSuper = tok('super', 'SUPER_ADMIN', null);
    tColab = tok('colab', 'COLLABORATOR', A); tContador = tok('contador', 'CONTADOR', null); tSupplier = tok('supplier', 'SUPPLIER', A);
  });
  afterAll(async () => { await app?.close(); });

  const preview = (t: string, f: number, formato: string, conteudo: string) =>
    request(app.getHttpServer()).post(`${base(f)}/importacao/preview`).set(auth(t)).send({ formato, conteudo });
  const confirmar = (t: string, f: number, token: string) =>
    request(app.getHttpServer()).post(`${base(f)}/importacao/confirmar`).set(auth(t)).send({ token });

  it('preview não grava Item; confirmar grava só NOVO; repetir não duplica; decimal pt-BR exato', async () => {
    const csv = 'codigo;nome;unidade;preco\nP1;Arroz;kg;"1.234,56"\nP2;Feijão;kg;8,90\nP3;;kg;1\n';
    const p = await preview(tA, fA, 'csv', csv).expect(200);
    expect(p.body.resumo).toMatchObject({ novos: 2, invalidos: 1 });
    expect(await count(fA)).toBe(0);
    const c1 = await confirmar(tA, fA, p.body.token).expect(200);
    expect(c1.body).toMatchObject({ criados: 2, invalidos: 1, repetida: false });
    const arroz = await prisma.item.findFirstOrThrow({ where: { fornecedorId: fA, codigoFornecedor: 'P1' } });
    expect(arroz.precoAtual!.toString()).toBe('1234.56');
    const c2 = await confirmar(tA, fA, p.body.token).expect(200);
    expect(c2.body).toMatchObject({ criados: 2, repetida: true });
    expect(await count(fA)).toBe(2);
    // mesmo arquivo em novo preview: tudo ignorado, nada duplica
    const p2 = await preview(tA, fA, 'csv', csv).expect(200);
    expect(p2.body.resumo).toMatchObject({ novos: 0, ignorados: 2 });
    await confirmar(tA, fA, p2.body.token).expect(200);
    expect(await count(fA)).toBe(2);
  });

  it('duplicata por nome normalizado+unidade (texto) e colisão por código vai para revisão sem sobrescrever', async () => {
    await prisma.item.create({ data: { nome: 'Açúcar', unidadeMedida: 'kg', restauranteId: A, fornecedorId: fA } });
    const p = await preview(tA, fA, 'texto', 'acucar;kg\nAçúcar;pct').expect(200);
    expect(p.body.linhas.map((l: any) => l.acao)).toEqual(['IGNORAR', 'NOVO']);
    await confirmar(tA, fA, p.body.token).expect(200);
    const r = await preview(tA, fA, 'csv', 'codigo;nome;unidade;preco\nP1;Outro nome;kg;99\nZ1;Sal;kg;1\nZ1;Pimenta;kg;1').expect(200);
    expect(r.body.linhas.map((l: any) => l.acao)).toEqual(['REVISAO', 'REVISAO', 'REVISAO']);
    await confirmar(tA, fA, r.body.token).expect(200);
    const p1 = await prisma.item.findFirstOrThrow({ where: { fornecedorId: fA, codigoFornecedor: 'P1' } });
    expect(p1.nome).toBe('Arroz');
    expect(p1.precoAtual!.toString()).toBe('1234.56');
  });

  it('erro parcial na gravação faz rollback total (nada gravado, preview segue PENDENTE)', async () => {
    const p = await preview(tA, fA, 'csv', 'codigo;nome;unidade\nR1;Item R1;un\nR2;Item R2;un').expect(200);
    // concorrente cria R2 entre preview e confirmação, com nome diferente => índice único estoura no 2º insert
    await prisma.item.create({ data: { nome: 'Concorrente', unidadeMedida: 'un', codigoFornecedor: 'R2', restauranteId: A, fornecedorId: fA } });
    const before = await count(fA);
    const c = await confirmar(tA, fA, p.body.token).expect(200);
    expect(c.body.criados).toBe(1); // R2 reclassificado (revisão), R1 criado: sem sobrescrever
    expect(await count(fA)).toBe(before + 1);
    // força colisão real: item com mesmo código inserido DENTRO da janela via índice
    const p2 = await preview(tA, fA, 'csv', 'codigo;nome;unidade\nS1;Item S1;un').expect(200);
    // revalidação cega dentro da transação real: simula corrida entre a checagem e o insert
    const orig = prisma.$transaction.bind(prisma) as any;
    const spy = jest.spyOn(prisma, '$transaction').mockImplementation(((fn: any, o?: any) =>
      orig((tx: any) => fn(new Proxy(tx, { get: (t, k) => (k === 'item' ? new Proxy(t.item, { get: (i, m) => (m === 'findMany' ? async () => [] : i[m]) }) : t[k]) })), o)) as any);
    await prisma.item.create({ data: { nome: 'Outro', unidadeMedida: 'un', codigoFornecedor: 'S1', restauranteId: A, fornecedorId: fA } });
    const n = await count(fA);
    await confirmar(tA, fA, p2.body.token).expect(409);
    spy.mockRestore();
    expect(await count(fA)).toBe(n);
    const row = await prisma.catalogoImportacao.findUniqueOrThrow({ where: { token: p2.body.token } });
    expect(row.status).toBe('PENDENTE');
  });

  it('arquivo vazio/inválido => 400; encoding BOM e latin1; decimal', async () => {
    await preview(tA, fA, 'csv', '   ').expect(400);
    await preview(tA, fA, 'csv', 'nome;unidade\n').expect(400);
    await preview(tA, fA, 'xml', 'x').expect(400);
    const p = await preview(tA, fA, 'csv', '\ufeffnome;unidade;preco\nBOM Item;kg;1,5').expect(200);
    expect(p.body.linhas[0]).toMatchObject({ nome: 'BOM Item', precoAtual: 1.5, acao: 'NOVO' });
    expect(parseDecimalPtBr('1.234,56')).toBe(1234.56);
  });

  it('CRUD, filtro/busca e inativação lógica (item não é removido)', async () => {
    const c = await request(app.getHttpServer()).post(base(fA)).set(auth(tA)).send({ nome: 'Leite', unidadeMedida: 'L', codigoFornecedor: 'L1', precoAtual: 4.25 }).expect(201);
    await request(app.getHttpServer()).post(base(fA)).set(auth(tA)).send({ nome: 'Leite2', unidadeMedida: 'L', codigoFornecedor: 'L1' }).expect(409);
    const l = await request(app.getHttpServer()).get(`${base(fA)}?q=leit`).set(auth(tA)).expect(200);
    expect(l.body.map((i: any) => i.nome)).toContain('Leite');
    await request(app.getHttpServer()).put(`${base(fA)}/${c.body.id}`).set(auth(tA)).send({ marca: 'Piracanjuba', precoAtual: 5 }).expect(200);
    await request(app.getHttpServer()).delete(`${base(fA)}/${c.body.id}`).set(auth(tA)).expect(200);
    const it = await prisma.item.findUniqueOrThrow({ where: { id: c.body.id } });
    expect(it).toMatchObject({ ativo: false, marca: 'Piracanjuba' });
    const inativos = await request(app.getHttpServer()).get(`${base(fA)}?ativo=false`).set(auth(tA)).expect(200);
    expect(inativos.body.map((i: any) => i.id)).toContain(c.body.id);
  });

  it('isolamento A vs B: fornecedor, item e preview de outro tenant => 404', async () => {
    const pB = await preview(tB, fB, 'texto', 'Tomate;kg').expect(200);
    await request(app.getHttpServer()).get(base(fB)).set(auth(tA)).expect(404);
    await request(app.getHttpServer()).post(base(fB)).set(auth(tA)).send({ nome: 'x', unidadeMedida: 'kg' }).expect(404);
    await preview(tA, fB, 'texto', 'x').expect(404);
    await confirmar(tA, fB, pB.body.token).expect(404);
    await confirmar(tA, fA, pB.body.token).expect(404); // token de B via rota de A
    expect(await count(fB)).toBe(0);
    const itemA = await prisma.item.findFirstOrThrow({ where: { fornecedorId: fA } });
    await request(app.getHttpServer()).put(`${base(fB)}/${itemA.id}`).set(auth(tB)).send({ marca: 'x' }).expect(404);
    await request(app.getHttpServer()).delete(`${base(fA)}/${itemA.id}`).set(auth(tB)).expect(404);
    // restauranteId na query não permite admin cruzar tenant
    await request(app.getHttpServer()).get(`${base(fB)}?restauranteId=${B}`).set(auth(tA)).expect(404);
  });

  it('SUPER_ADMIN exige tenant explícito; demais papéis => 403', async () => {
    await request(app.getHttpServer()).get(base(fA)).set(auth(tSuper)).expect(400);
    await request(app.getHttpServer()).get(`${base(fA)}?restauranteId=${A}`).set(auth(tSuper)).expect(200);
    await request(app.getHttpServer()).get(`${base(fA)}?restauranteId=${B}`).set(auth(tSuper)).expect(404);
    for (const t of [tColab, tContador, tSupplier]) {
      await request(app.getHttpServer()).get(`${base(fA)}?restauranteId=${A}`).set(auth(t)).expect(403);
      await request(app.getHttpServer()).post(`${base(fA)}/importacao/preview`).set(auth(t)).send({ formato: 'texto', conteudo: 'x' }).expect(403);
    }
    await request(app.getHttpServer()).get(base(fA)).expect(401);
  });
});
