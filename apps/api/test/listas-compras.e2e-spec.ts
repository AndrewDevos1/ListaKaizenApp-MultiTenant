import { INestApplication } from '@nestjs/common';
import { PrismaClient, StatusPedido, StatusSubmissao, UserRole } from '@prisma/client';
import { api, bearer, bootApp, describeDb, login, mkTenant, mkUser, reporter } from './helpers/e2e-app';

// E2E de LISTAS DE COMPRAS: API NestJS real + JWT real + PostgreSQL descartável.
const rep = reporter('listas-compras', 'Relatório E2E — Listas de Compras');

describeDb('E2E Listas de Compras (API + PostgreSQL descartável)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let L1: { id: number }, L2: { id: number };
  let adm1: string, adm2: string, sup: string, col1: string, col2: string, col3: string;
  let col1Id: number, col2Id: number, col3Id: number;
  let listaId: number;
  let itemIds: { tomate: number; cebola: number; alface: number };
  let refIds: { tomate: number; cebola: number; alface: number };
  let submissaoId: number;

  const get = (t: string, p: string) => api(app).get(`/api/v1${p}`).set(bearer(t));
  const post = (t: string, p: string, b: object = {}) => api(app).post(`/api/v1${p}`).set(bearer(t)).send(b);
  const put = (t: string, p: string, b: object = {}) => api(app).put(`/api/v1${p}`).set(bearer(t)).send(b);
  const del = (t: string, p: string) => api(app).delete(`/api/v1${p}`).set(bearer(t));
  const seq = async <T>(fs: Array<() => Promise<T>>) => { const o: T[] = []; for (const f of fs) o.push(await f()); return o; };
  const pedidosDb = (sid: number) => prisma.pedido.findMany({ where: { submissaoId: sid }, orderBy: { itemId: 'asc' } });
  const qtd = async (sid: number) => Object.fromEntries((await pedidosDb(sid)).map((p) => [p.itemId, p.qtdSolicitada]));

  beforeAll(async () => {
    ({ app, prisma } = await bootApp());
    L1 = await mkTenant(prisma, 'E2E Listas L1');
    L2 = await mkTenant(prisma, 'E2E Listas L2');
    const a1 = await mkUser(prisma, 'Admin Listas 1', UserRole.ADMIN, L1.id);
    const a2 = await mkUser(prisma, 'Admin Listas 2', UserRole.ADMIN, L2.id);
    const su = await mkUser(prisma, 'Super Listas', UserRole.SUPER_ADMIN, null);
    const c1 = await mkUser(prisma, 'Colab Listas 1', UserRole.COLLABORATOR, L1.id);
    const c2 = await mkUser(prisma, 'Colab Listas 2 sem lista', UserRole.COLLABORATOR, L1.id);
    const c3 = await mkUser(prisma, 'Colab Listas 3 outro restaurante', UserRole.COLLABORATOR, L2.id);
    [col1Id, col2Id, col3Id] = [c1.id, c2.id, c3.id];
    [adm1, adm2, sup, col1, col2, col3] = await Promise.all([a1, a2, su, c1, c2, c3].map((u) => login(app, u.email)));
  });
  afterAll(async () => {
    rep.flush();
    await app?.close();
    await prisma?.$disconnect();
  });

  it('L1 ADMIN monta a lista: cria itens, lista, vincula colaborador, define mínimos e fardo', async () => {
    await rep.step('L1 montagem', 'ADMIN cria 3 itens', async () => {
      const mk = async (nome: string, un: string) => { const r = await post(adm1, '/items', { nome, unidadeMedida: un }); expect(r.status).toBe(201); return r.body.id as number; };
      itemIds = { tomate: await mk('Tomate E2E', 'kg'), cebola: await mk('Cebola E2E', 'kg'), alface: await mk('Alface E2E', 'un') };
      const rows = await prisma.item.findMany({ where: { id: { in: Object.values(itemIds) } } });
      expect(rows.every((i) => i.restauranteId === L1.id)).toBe(true);
      return { http: '201x3', efeito: '3 itens persistidos com restauranteId do ADMIN' };
    });
    await rep.step('L1 montagem', 'ADMIN cria lista com colaborador; colaborador de outro restaurante => 404 e nada criado', async () => {
      const ruim = await post(adm1, '/listas', { nome: 'Lista inválida', colaboradorIds: [col3Id] });
      expect(ruim.status).toBe(404);
      expect(await prisma.lista.count({ where: { restauranteId: L1.id, nome: 'Lista inválida' } })).toBe(0);
      const r = await post(adm1, '/listas', { nome: 'Compras Semanais E2E', descricao: 'fictícia', colaboradorIds: [col1Id] });
      expect(r.status).toBe(201);
      listaId = r.body.id;
      const db = await prisma.lista.findUnique({ where: { id: listaId }, include: { colaboradores: true } });
      expect(db).toMatchObject({ restauranteId: L1.id, nome: 'Compras Semanais E2E', deletado: false });
      expect(db?.colaboradores.map((c) => c.usuarioId)).toEqual([col1Id]);
      return { http: '404/201', efeito: 'lista no banco com 1 colaborador; lista inválida não persistida' };
    });
    await rep.step('L1 montagem', 'ADMIN adiciona itens com mínimos 10/5/8; duplicado => 409', async () => {
      const t = await post(adm1, `/listas/${listaId}/itens`, { itemId: itemIds.tomate, quantidadeMinima: 10 });
      const c = await post(adm1, `/listas/${listaId}/itens`, { itemId: itemIds.cebola, quantidadeMinima: 5 });
      const a = await post(adm1, `/listas/${listaId}/itens`, { itemId: itemIds.alface, quantidadeMinima: 8 });
      expect([t.status, c.status, a.status]).toEqual([201, 201, 201]);
      refIds = { tomate: t.body.id, cebola: c.body.id, alface: a.body.id };
      const dup = await post(adm1, `/listas/${listaId}/itens`, { itemId: itemIds.tomate, quantidadeMinima: 99 });
      expect(dup.status).toBe(409);
      const refs = await prisma.listaItemRef.findMany({ where: { listaId }, orderBy: { itemId: 'asc' } });
      expect(refs.map((r) => r.quantidadeMinima)).toEqual([10, 5, 8]);
      return { http: '201x3/409', efeito: '3 refs com mínimos corretos; duplicata barrada' };
    });
    await rep.step('L1 montagem', 'ADMIN configura fardo de 12 com threshold na alface', async () => {
      const r = await put(adm1, `/listas/${listaId}/itens/${refIds.alface}`, { usaThreshold: true, qtdFardo: 12 });
      expect(r.status).toBe(200);
      expect(await prisma.listaItemRef.findUnique({ where: { id: refIds.alface } })).toMatchObject({ usaThreshold: true, qtdFardo: 12 });
      return { http: r.status, efeito: 'qtdFardo=12 persistido' };
    });
    await rep.step('L1 montagem', 'quantidadeMinima negativa em addItemRef => 400 e nada criado', async () => {
      const novo = await post(adm1, '/items', { nome: 'Item Negativo E2E', unidadeMedida: 'kg' });
      const r = await post(adm1, `/listas/${listaId}/itens`, { itemId: novo.body.id, quantidadeMinima: -1 });
      expect(r.status).toBe(400);
      expect(await prisma.listaItemRef.count({ where: { listaId, itemId: novo.body.id } })).toBe(0);
      const ok = await post(adm1, `/listas/${listaId}/itens`, { itemId: novo.body.id, quantidadeMinima: 0 });
      expect(ok.status).toBe(201);
      await del(adm1, `/listas/${listaId}/itens/${novo.body.id}`).expect(200);
      expect(await prisma.listaItemRef.count({ where: { listaId, itemId: novo.body.id } })).toBe(0);
      return { http: '400/201/200', efeito: 'mínimo -1 recusado; 0 aceito; ref removida (3 itens na lista)' };
    });
    await rep.step('L1 montagem', 'item de outro restaurante não entra na lista => 404 e nada criado', async () => {
      const outro = await prisma.item.create({ data: { nome: `Item L2 ${Date.now()}`, unidadeMedida: 'kg', restauranteId: L2.id } });
      const r = await post(adm1, `/listas/${listaId}/itens`, { itemId: outro.id, quantidadeMinima: 3 });
      expect(r.status).toBe(404);
      expect(await prisma.listaItemRef.count({ where: { listaId, itemId: outro.id } })).toBe(0);
      return { http: r.status, efeito: 'nenhum ListaItemRef cross-tenant' };
    });
  });

  it('L2 colaborador acessa só a sua lista, preenche estoque e envia a submissão', async () => {
    await rep.step('L2 colaborador', 'minhas-listas: col1 vê a lista; col2 (não atribuído) não vê', async () => {
      const a = await get(col1, '/collaborator/minhas-listas');
      const b = await get(col2, '/collaborator/minhas-listas');
      expect(a.status).toBe(200);
      expect(a.body.map((l: any) => l.id)).toEqual([listaId]);
      expect(a.body[0]._count.itensRef).toBe(3);
      expect(b.body).toEqual([]);
      return { http: '200/200', efeito: 'col1: 1 lista com 3 itens; col2: 0' };
    });
    await rep.step('L2 colaborador', 'detalhe da lista: atribuído 200; não atribuído e outro restaurante 404', async () => {
      const a = await get(col1, `/listas/${listaId}`);
      const b = await get(col2, `/listas/${listaId}`);
      const c = await get(col3, `/listas/${listaId}`);
      expect([a.status, b.status, c.status]).toEqual([200, 404, 404]);
      expect(a.body.itensRef).toHaveLength(3);
      return { http: '200/404/404', efeito: 'isolamento por atribuição e por restaurante' };
    });
    await rep.step('L2 colaborador', 'colaborador não administra: criar lista, ver submissões admin, aprovar => 403', async () => {
      const antes = await prisma.lista.count({ where: { restauranteId: L1.id } });
      const rs = await Promise.all([
        post(col1, '/listas', { nome: 'Lista do colab' }),
        get(col1, '/admin/submissoes'),
        post(col1, '/admin/submissoes/1/aprovar'),
        post(col1, `/listas/${listaId}/itens`, { itemId: itemIds.tomate, quantidadeMinima: 1 }),
        put(col1, `/listas/${listaId}/itens/${refIds.tomate}`, { quantidadeMinima: 1 }),
        del(col1, `/listas/${listaId}`),
        post(col1, '/items', { nome: 'Item do colab', unidadeMedida: 'kg' }),
      ]);
      expect(rs.map((r) => r.status)).toEqual([403, 403, 403, 403, 403, 403, 403]);
      expect(await prisma.lista.count({ where: { restauranteId: L1.id } })).toBe(antes);
      expect((await prisma.lista.findUnique({ where: { id: listaId } }))?.deletado).toBe(false);
      expect((await prisma.listaItemRef.findUnique({ where: { id: refIds.tomate } }))?.quantidadeMinima).toBe(10);
      return { http: '403x7', efeito: 'lista/itens/mínimos intactos' };
    });
    await rep.step('L2 colaborador', 'colaborador não atribuído não preenche nem submete => 404, sem efeito', async () => {
      const e = await put(col2, `/collaborator/listas/${listaId}/estoque`, { itens: [{ itemRefId: refIds.tomate, quantidadeAtual: 1 }] });
      const s = await post(col2, `/collaborator/listas/${listaId}/submeter`);
      expect([e.status, s.status]).toEqual([404, 404]);
      expect((await prisma.listaItemRef.findUnique({ where: { id: refIds.tomate } }))?.quantidadeAtual).toBe(0);
      expect(await prisma.submissao.count({ where: { listaId } })).toBe(0);
      return { http: '404/404', efeito: 'quantidadeAtual=0 e 0 submissões' };
    });
    await rep.step('L2 colaborador', 'tudo acima do mínimo => 422 e nenhuma submissão', async () => {
      const e = await put(col1, `/collaborator/listas/${listaId}/estoque`, { itens: [{ itemRefId: refIds.tomate, quantidadeAtual: 50 }, { itemRefId: refIds.cebola, quantidadeAtual: 50 }, { itemRefId: refIds.alface, quantidadeAtual: 50 }] });
      expect(e.status).toBe(200);
      const s = await post(col1, `/collaborator/listas/${listaId}/submeter`);
      expect(s.status).toBe(422);
      expect(await prisma.submissao.count({ where: { listaId } })).toBe(0);
      return { http: '200/422', efeito: '0 submissões, 0 pedidos' };
    });
    await rep.step('L2 colaborador', 'estoque com refs de outra lista => 404 e nada gravado; quantidade negativa => 400', async () => {
      const outra = await prisma.lista.create({ data: { nome: 'Outra lista L1', restauranteId: L1.id } });
      const refOutra = await prisma.listaItemRef.create({ data: { listaId: outra.id, itemId: itemIds.tomate, quantidadeMinima: 1 } });
      const e = await put(col1, `/collaborator/listas/${listaId}/estoque`, { itens: [{ itemRefId: refIds.tomate, quantidadeAtual: 7 }, { itemRefId: refOutra.id, quantidadeAtual: 9 }] });
      expect(e.status).toBe(404);
      expect((await prisma.listaItemRef.findUnique({ where: { id: refIds.tomate } }))?.quantidadeAtual).toBe(50);
      expect((await prisma.listaItemRef.findUnique({ where: { id: refOutra.id } }))?.quantidadeAtual).toBe(0);
      const neg = await put(col1, `/collaborator/listas/${listaId}/estoque`, { itens: [{ itemRefId: refIds.tomate, quantidadeAtual: -5 }] });
      expect(neg.status).toBe(400);
      expect((await prisma.listaItemRef.findUnique({ where: { id: refIds.tomate } }))?.quantidadeAtual).toBe(50);
      return { http: '404/400', efeito: 'nenhuma quantidade alterada nas duas tentativas inválidas' };
    });
    await rep.step('L2 colaborador', 'preenche tomate=4, cebola=5 (= mínimo), alface=2 e submete => pedidos 6 e 12', async () => {
      const e = await put(col1, `/collaborator/listas/${listaId}/estoque`, { itens: [{ itemRefId: refIds.tomate, quantidadeAtual: 4 }, { itemRefId: refIds.cebola, quantidadeAtual: 5 }, { itemRefId: refIds.alface, quantidadeAtual: 2 }] });
      expect(e.status).toBe(200);
      const refs = await prisma.listaItemRef.findMany({ where: { listaId }, orderBy: { itemId: 'asc' } });
      expect(refs.map((r) => r.quantidadeAtual)).toEqual([4, 5, 2]);
      const s = await post(col1, `/collaborator/listas/${listaId}/submeter`);
      expect(s.status).toBe(201);
      submissaoId = s.body.id;
      expect(s.body.status).toBe(StatusSubmissao.PENDENTE);
      const db = await prisma.submissao.findUnique({ where: { id: submissaoId } });
      expect(db).toMatchObject({ listaId, usuarioId: col1Id, restauranteId: L1.id, status: 'PENDENTE', arquivada: false });
      expect(await qtd(submissaoId)).toEqual({ [itemIds.tomate]: 6, [itemIds.alface]: 12 }); // cebola no mínimo: sem pedido; alface usa fardo
      expect((await pedidosDb(submissaoId)).every((p) => p.status === 'PENDENTE')).toBe(true);
      return { http: '200/201', efeito: 'Submissao PENDENTE + pedidos {tomate:6, alface:12}; cebola sem pedido' };
    });
    await rep.step('L2 colaborador', 'colaborador vê a própria submissão e não a de outro', async () => {
      const mine = await get(col1, '/collaborator/submissoes');
      const one = await get(col1, `/collaborator/submissoes/${submissaoId}`);
      const other = await get(col2, `/collaborator/submissoes/${submissaoId}`);
      expect(mine.body.map((s: any) => s.id)).toContain(submissaoId);
      expect(one.status).toBe(200);
      expect(one.body.pedidos).toHaveLength(2);
      expect(other.status).toBe(404);
      return { http: '200/200/404', efeito: 'detalhe com 2 pedidos; outro colaborador 404' };
    });
  });

  it('L3 ADMIN consulta, edita submissão PENDENTE (recalcula pedidos) e decide', async () => {
    await rep.step('L3 admin', 'lista e detalha submissões (filtro por status)', async () => {
      const all = await get(adm1, '/admin/submissoes');
      const pend = await get(adm1, '/admin/submissoes?status=PENDENTE');
      const apr = await get(adm1, '/admin/submissoes?status=APROVADO');
      expect(all.body.map((s: any) => s.id)).toContain(submissaoId);
      expect(pend.body.map((s: any) => s.id)).toContain(submissaoId);
      expect(apr.body.map((s: any) => s.id)).not.toContain(submissaoId);
      const one = await get(adm1, `/admin/submissoes/${submissaoId}`);
      expect(one.status).toBe(200);
      expect(one.body.pedidos).toHaveLength(2);
      expect(one.body.usuario.id).toBe(col1Id);
      return { http: '200x4', efeito: 'filtros por status coerentes com o banco' };
    });
    await rep.step('L3 admin', 'edição inválida (itens duplicados, item fora da lista, tudo acima do mínimo) => 400 e pedidos intactos', async () => {
      const dup = await put(adm1, `/admin/submissoes/${submissaoId}/editar`, { itens: [{ itemId: itemIds.tomate, quantidadeAtual: 1 }, { itemId: itemIds.tomate, quantidadeAtual: 2 }] });
      const fora = await put(adm1, `/admin/submissoes/${submissaoId}/editar`, { itens: [{ itemId: 999999999, quantidadeAtual: 1 }] });
      const todos = await put(adm1, `/admin/submissoes/${submissaoId}/editar`, { itens: [{ itemId: itemIds.tomate, quantidadeAtual: 99 }, { itemId: itemIds.cebola, quantidadeAtual: 99 }, { itemId: itemIds.alface, quantidadeAtual: 99 }] });
      expect([dup.status, fora.status, todos.status]).toEqual([400, 400, 400]);
      expect(await qtd(submissaoId)).toEqual({ [itemIds.tomate]: 6, [itemIds.alface]: 12 });
      expect((await prisma.listaItemRef.findUnique({ where: { id: refIds.tomate } }))?.quantidadeAtual).toBe(4); // transação reverteu
      return { http: '400x3', efeito: 'pedidos {6,12} e quantidades atuais preservados' };
    });
    await rep.step('L3 admin', 'edita tomate=8, cebola=1, alface=20 => pedidos recalculados {tomate:2, cebola:4}', async () => {
      const r = await put(adm1, `/admin/submissoes/${submissaoId}/editar`, { itens: [{ itemId: itemIds.tomate, quantidadeAtual: 8 }, { itemId: itemIds.cebola, quantidadeAtual: 1 }, { itemId: itemIds.alface, quantidadeAtual: 20 }] });
      expect(r.status).toBe(200);
      expect(await qtd(submissaoId)).toEqual({ [itemIds.tomate]: 2, [itemIds.cebola]: 4 });
      const refs = await prisma.listaItemRef.findMany({ where: { listaId }, orderBy: { itemId: 'asc' } });
      expect(refs.map((x) => x.quantidadeAtual)).toEqual([8, 1, 20]);
      expect(await prisma.pedido.count({ where: { submissaoId } })).toBe(2);
      expect((await prisma.submissao.findUnique({ where: { id: submissaoId } }))?.status).toBe('PENDENTE');
      return { http: r.status, efeito: 'banco: 2 pedidos {2,4}; estoque atual atualizado' };
    });
    await rep.step('L3 admin', 'edições concorrentes (6x) não duplicam pedidos', async () => {
      const body = { itens: [{ itemId: itemIds.tomate, quantidadeAtual: 3 }, { itemId: itemIds.cebola, quantidadeAtual: 1 }] };
      const rs = await Promise.all(Array.from({ length: 6 }, () => put(adm1, `/admin/submissoes/${submissaoId}/editar`, body)));
      expect(rs.every((r) => r.status === 200)).toBe(true);
      const pedidos = await pedidosDb(submissaoId);
      expect(pedidos).toHaveLength(2);
      expect(await qtd(submissaoId)).toEqual({ [itemIds.tomate]: 7, [itemIds.cebola]: 4 });
      return { http: '200x6', efeito: 'exatamente 2 pedidos {7,4} no banco' };
    });
    await rep.step('L3 admin', 'aprova: submissão e pedidos APROVADO; aprovação repetida é idempotente', async () => {
      const a = await post(adm1, `/admin/submissoes/${submissaoId}/aprovar`);
      expect(a.status).toBe(201);
      expect(a.body.status).toBe('APROVADO');
      const antes = await pedidosDb(submissaoId);
      const b = await post(adm1, `/admin/submissoes/${submissaoId}/aprovar`);
      expect(b.status).toBe(201);
      const depois = await pedidosDb(submissaoId);
      expect(depois.map((p) => [p.id, p.status, p.qtdSolicitada])).toEqual(antes.map((p) => [p.id, p.status, p.qtdSolicitada]));
      expect(depois.every((p) => p.status === 'APROVADO')).toBe(true);
      expect((await prisma.submissao.findUnique({ where: { id: submissaoId } }))?.status).toBe('APROVADO');
      return { http: '201/201', efeito: '2 pedidos APROVADO; repetição não altera nada' };
    });
    await rep.step('L3 admin', 'submissão aprovada não pode mais ser editada => 400, pedidos intactos', async () => {
      const r = await put(adm1, `/admin/submissoes/${submissaoId}/editar`, { itens: [{ itemId: itemIds.tomate, quantidadeAtual: 0 }] });
      expect(r.status).toBe(400);
      expect(await qtd(submissaoId)).toEqual({ [itemIds.tomate]: 7, [itemIds.cebola]: 4 });
      return { http: r.status, efeito: 'pedidos {7,4} preservados' };
    });
    await rep.step('L3 admin', 'reverte para PENDENTE, rejeita, reverte; aprova 1 pedido e rejeita outro => PARCIAL', async () => {
      const rev = await put(adm1, `/admin/submissoes/${submissaoId}/reverter`);
      expect(rev.status).toBe(200);
      expect((await pedidosDb(submissaoId)).every((p) => p.status === 'PENDENTE')).toBe(true);
      const rej = await post(adm1, `/admin/submissoes/${submissaoId}/rejeitar`);
      expect(rej.body.status).toBe('REJEITADO');
      expect((await pedidosDb(submissaoId)).every((p) => p.status === 'REJEITADO')).toBe(true);
      await put(adm1, `/admin/submissoes/${submissaoId}/reverter`).expect(200);
      const [p1, p2] = await pedidosDb(submissaoId);
      const s1 = await put(adm1, `/admin/pedidos/${p1.id}/status`, { status: StatusPedido.APROVADO });
      const s1b = await put(adm1, `/admin/pedidos/${p1.id}/status`, { status: StatusPedido.REJEITADO });
      const s2 = await put(adm1, `/admin/pedidos/${p2.id}/status`, { status: StatusPedido.REJEITADO });
      expect([s1.status, s1b.status, s2.status]).toEqual([200, 400, 200]);
      const db = await prisma.submissao.findUnique({ where: { id: submissaoId } });
      expect(db?.status).toBe('PARCIAL');
      expect((await pedidosDb(submissaoId)).map((p) => p.status)).toEqual(['APROVADO', 'REJEITADO']);
      return { http: '200/201/200/200/400/200', efeito: 'status PARCIAL; transição inválida barrada' };
    });
    await rep.step('L3 admin', 'aprovações concorrentes (5x) deixam estado único e consistente', async () => {
      await put(adm1, `/admin/submissoes/${submissaoId}/reverter`).expect(200);
      const rs = await Promise.all(Array.from({ length: 5 }, () => post(adm1, `/admin/submissoes/${submissaoId}/aprovar`)));
      expect(rs.every((r) => r.status === 201)).toBe(true);
      expect((await prisma.submissao.findUnique({ where: { id: submissaoId } }))?.status).toBe('APROVADO');
      const pedidos = await pedidosDb(submissaoId);
      expect(pedidos).toHaveLength(2);
      expect(pedidos.every((p) => p.status === 'APROVADO')).toBe(true);
      return { http: '201x5', efeito: '2 pedidos APROVADO, sem duplicação' };
    });
    await rep.step('L3 admin', 'arquivar e desarquivar refletem no banco e nos filtros', async () => {
      const a = await put(adm1, `/admin/submissoes/${submissaoId}/arquivar`);
      expect(a.status).toBe(200);
      expect(await prisma.submissao.findUnique({ where: { id: submissaoId } })).toMatchObject({ arquivada: true, status: 'ARQUIVADO' });
      const f = await get(adm1, '/admin/submissoes?arquivada=true');
      expect(f.body.map((s: any) => s.id)).toContain(submissaoId);
      const d = await put(adm1, `/admin/submissoes/${submissaoId}/desarquivar`);
      expect(d.status).toBe(200);
      expect((await prisma.submissao.findUnique({ where: { id: submissaoId } }))?.arquivada).toBe(false);
      return { http: '200x3', efeito: 'arquivada true/false persistida' };
    });
  });

  it('L4 idempotência e concorrência do envio', async () => {
    const lista = await post(adm1, '/listas', { nome: 'Lista Idempotência E2E', colaboradorIds: [col1Id] });
    const lid = lista.body.id as number;
    const item = await post(adm1, '/items', { nome: 'Farinha E2E', unidadeMedida: 'kg' });
    const ref = await post(adm1, `/listas/${lid}/itens`, { itemId: item.body.id, quantidadeMinima: 10 });
    await put(col1, `/collaborator/listas/${lid}/estoque`, { itens: [{ itemRefId: ref.body.id, quantidadeAtual: 2 }] }).expect(200);
    await rep.step('L4 idempotência', '6 envios simultâneos do mesmo colaborador criam apenas 1 submissão PENDENTE', async () => {
      const rs = await Promise.all(Array.from({ length: 6 }, () => post(col1, `/collaborator/listas/${lid}/submeter`)));
      const ok = rs.filter((r) => r.status === 201);
      const rest = rs.filter((r) => r.status !== 201);
      expect(ok).toHaveLength(1);
      expect(rest.every((r) => r.status === 409)).toBe(true);
      const subs = await prisma.submissao.findMany({ where: { listaId: lid }, include: { pedidos: true } });
      expect(subs).toHaveLength(1);
      expect(subs[0].pedidos).toHaveLength(1);
      expect(subs[0].pedidos[0].qtdSolicitada).toBe(8);
      return { http: '1x201 + 5x409', efeito: '1 Submissao e 1 Pedido (8) no banco' };
    });
    await rep.step('L4 idempotência', 'novo envio enquanto há PENDENTE => 409; após decisão, novo envio é permitido', async () => {
      const dup = await post(col1, `/collaborator/listas/${lid}/submeter`);
      expect(dup.status).toBe(409);
      const sub = await prisma.submissao.findFirstOrThrow({ where: { listaId: lid } });
      await post(adm1, `/admin/submissoes/${sub.id}/aprovar`).expect(201);
      const novo = await post(col1, `/collaborator/listas/${lid}/submeter`);
      expect(novo.status).toBe(201);
      expect(await prisma.submissao.count({ where: { listaId: lid } })).toBe(2);
      return { http: '409/201/201', efeito: '2 submissões ao todo (1 aprovada + 1 nova pendente)' };
    });
    await rep.step('L4 idempotência', 'lista excluída (soft delete) some do colaborador e não aceita envio', async () => {
      const r = await del(adm1, `/listas/${lid}`);
      expect(r.status).toBe(200);
      expect((await prisma.lista.findUnique({ where: { id: lid } }))?.deletado).toBe(true);
      const mine = await get(col1, '/collaborator/minhas-listas');
      expect(mine.body.map((l: any) => l.id)).not.toContain(lid);
      const s = await post(col1, `/collaborator/listas/${lid}/submeter`);
      expect(s.status).toBe(404);
      expect(await prisma.submissao.count({ where: { listaId: lid } })).toBe(2);
      return { http: '200/404', efeito: 'deletado=true; sem novas submissões' };
    });
  });

  it('L5 isolamento multi-tenant e RBAC de submissões', async () => {
    await rep.step('L5 isolamento', 'ADMIN do restaurante 2 não enxerga nem altera lista/submissão do restaurante 1', async () => {
      const antes = await qtd(submissaoId);
      const pedidoId0 = (await pedidosDb(submissaoId))[0].id;
      const status = (await prisma.submissao.findUniqueOrThrow({ where: { id: submissaoId } })).status;
      const rs = await seq([
        () => get(adm2, `/listas/${listaId}`),
        () => get(adm2, `/listas/${listaId}/itens`),
        () => put(adm2, `/listas/${listaId}`, { nome: 'Sequestrada' }),
        () => del(adm2, `/listas/${listaId}`),
        () => post(adm2, `/listas/${listaId}/colaboradores`, { usuarioId: col3Id }),
        () => get(adm2, `/admin/submissoes/${submissaoId}`),
        () => post(adm2, `/admin/submissoes/${submissaoId}/rejeitar`),
        () => put(adm2, `/admin/submissoes/${submissaoId}/reverter`),
        () => put(adm2, `/admin/submissoes/${submissaoId}/editar`, { itens: [{ itemId: itemIds.tomate, quantidadeAtual: 0 }] }),
        () => put(adm2, `/admin/submissoes/${submissaoId}/arquivar`),
        () => put(adm2, `/admin/pedidos/${pedidoId0}/status`, { status: 'REJEITADO' }),
        () => get(adm2, `/items/${itemIds.tomate}`),
      ]);
      expect(rs.map((r) => r.status)).toEqual(Array(12).fill(404));
      expect(await qtd(submissaoId)).toEqual(antes);
      expect((await prisma.submissao.findUniqueOrThrow({ where: { id: submissaoId } })).status).toBe(status);
      expect((await prisma.lista.findUniqueOrThrow({ where: { id: listaId } })).nome).toBe('Compras Semanais E2E');
      return { http: '404x12', efeito: 'lista, pedidos e status do restaurante 1 inalterados' };
    });
    await rep.step('L5 isolamento', 'addItemRef cross-tenant: ADMIN 2 não vincula item do restaurante 1 à sua lista nem altera lista do 1', async () => {
      const proprio = await post(adm2, '/listas', { nome: 'Lista L2 cross-tenant' });
      expect(proprio.status).toBe(201);
      const itemL2 = await post(adm2, '/items', { nome: 'Item próprio L2', unidadeMedida: 'kg' });
      const a = await post(adm2, `/listas/${proprio.body.id}/itens`, { itemId: itemIds.tomate, quantidadeMinima: 5 }); // item do tenant 1
      const b = await post(adm2, `/listas/${listaId}/itens`, { itemId: itemL2.body.id, quantidadeMinima: 5 }); // lista do tenant 1
      const c = await post(adm1, `/listas/${listaId}/itens`, { itemId: itemL2.body.id, quantidadeMinima: 5 }); // item do tenant 2 na lista do 1
      expect([a.status, b.status, c.status]).toEqual([404, 404, 404]);
      expect(await prisma.listaItemRef.count({ where: { listaId: proprio.body.id } })).toBe(0);
      expect(await prisma.listaItemRef.count({ where: { listaId, itemId: itemL2.body.id } })).toBe(0);
      expect(await prisma.listaItemRef.count({ where: { listaId } })).toBe(3);
      const ok = await post(adm2, `/listas/${proprio.body.id}/itens`, { itemId: itemL2.body.id, quantidadeMinima: 5 });
      expect(ok.status).toBe(201);
      return { http: '404x3/201', efeito: 'nenhum ListaItemRef cross-tenant; vínculo legítimo do tenant 2 funciona' };
    });
    await rep.step('L5 isolamento', 'listagens do ADMIN 2 contêm só dados do restaurante 2, mesmo com restauranteId=1 na query', async () => {
      const l = await get(adm2, `/listas?restauranteId=${L1.id}`);
      const forjada = await get(adm2, `/admin/submissoes?restauranteId=${L1.id}`);
      expect(forjada.status).toBe(200);
      const s = forjada; // ADMIN com restauranteId forjado continua preso ao próprio tenant
      const i = await get(adm2, `/items?restauranteId=${L1.id}`);
      expect(l.status).toBe(200);
      expect(l.body.every((x: any) => x.restauranteId === L2.id)).toBe(true);
      expect(s.body.every((x: any) => x.restauranteId === L2.id)).toBe(true);
      expect(i.body.every((x: any) => x.restauranteId === L2.id)).toBe(true);
      return { http: '200x3', efeito: 'filtro vem do token; restauranteId forjado por ADMIN é ignorado' };
    });
    await rep.step('L5 isolamento', 'colaborador do restaurante 2 não acessa submissão/lista do restaurante 1', async () => {
      const rs = await Promise.all([get(col3, `/collaborator/submissoes/${submissaoId}`), put(col3, `/collaborator/listas/${listaId}/estoque`, { itens: [{ itemRefId: refIds.tomate, quantidadeAtual: 1 }] }), post(col3, `/collaborator/listas/${listaId}/submeter`)]);
      expect(rs.map((r) => r.status)).toEqual([404, 404, 404]);
      expect((await prisma.listaItemRef.findUniqueOrThrow({ where: { id: refIds.tomate } })).quantidadeAtual).toBe(3);
      return { http: '404x3', efeito: 'estoque do restaurante 1 inalterado' };
    });
    await rep.step('L5 governança', 'SUPER_ADMIN exige tenant explícito e respeita o selecionado', async () => {
      const sem = await get(sup, '/listas');
      const l1 = await get(sup, `/listas?restauranteId=${L1.id}`);
      const l2 = await get(sup, `/listas?restauranteId=${L2.id}`);
      expect(sem.status).toBe(403);
      expect(l1.status).toBe(200);
      expect(l1.body.every((x: any) => x.restauranteId === L1.id)).toBe(true);
      expect(l1.body.map((x: any) => x.id)).toContain(listaId);
      expect(l2.body.map((x: any) => x.id)).not.toContain(listaId);
      const subs = await get(sup, `/admin/submissoes?restauranteId=${L2.id}`);
      expect(subs.body.map((x: any) => x.id)).not.toContain(submissaoId);
      return { http: '403/200/200/200', efeito: 'sem tenant => 403; com tenant => só dados dele' };
    });
    await rep.step('L5 governança', 'flag moduloFuncionarios desligada bloqueia as listas admin e gera AppLog; dados preservados', async () => {
      const antes = await prisma.lista.count({ where: { restauranteId: L2.id } });
      const off = await api(app).put(`/api/restaurantes/${L2.id}/modulos`).set(bearer(sup)).send({ moduloFuncionarios: false });
      expect(off.status).toBe(200);
      const a = await get(adm2, '/listas');
      const b = await post(adm2, '/listas', { nome: 'Bloqueada' });
      const c = await get(sup, `/listas?restauranteId=${L2.id}`);
      const d = await get(col3, '/collaborator/minhas-listas');
      const e = await get(adm2, '/admin/grupos-listas');
      const f = await get(adm2, '/admin/submissoes');
      const g = await get(col3, '/collaborator/submissoes');
      expect([a.status, b.status, c.status, d.status, e.status, f.status, g.status]).toEqual([403, 403, 403, 403, 403, 403, 403]);
      expect(await prisma.lista.count({ where: { restauranteId: L2.id } })).toBe(antes);
      const log = await prisma.appLog.findFirstOrThrow({ where: { restauranteId: L2.id, acao: 'ATUALIZAR_MODULOS_RESTAURANTE' } });
      expect(log.detalhes).toEqual({ alteracoes: { moduloFuncionarios: { antes: true, depois: false } } });
      const l1 = await get(adm1, '/listas');
      expect(l1.status).toBe(200); // restaurante 1 não é afetado
      return { http: '200/403x3/200', efeito: 'AppLog {moduloFuncionarios:true->false}; restaurante 1 segue ativo' };
    });
  });

  it('L6 correção de submissão PENDENTE: colaborador não duplica; ADMIN corrige; estados decididos preservados', async () => {
    const lista = await post(adm1, '/listas', { nome: 'Lista Correção PENDENTE E2E', colaboradorIds: [col1Id] });
    const lid = lista.body.id as number;
    const item = await post(adm1, '/items', { nome: 'Sal E2E', unidadeMedida: 'kg' });
    const ref = await post(adm1, `/listas/${lid}/itens`, { itemId: item.body.id, quantidadeMinima: 10 });
    const itemId = item.body.id as number;
    let sid = 0;
    const subs = () => prisma.submissao.findMany({ where: { listaId: lid }, orderBy: { id: 'asc' } });
    await put(col1, `/collaborator/listas/${lid}/estoque`, { itens: [{ itemRefId: ref.body.id, quantidadeAtual: 2 }] }).expect(200);

    await rep.step('L6 correção', 'colaborador envia; segundo envio => 409 e nada muda', async () => {
      const s = await post(col1, `/collaborator/listas/${lid}/submeter`);
      expect(s.status).toBe(201);
      sid = s.body.id;
      expect(await qtd(sid)).toEqual({ [itemId]: 8 });
      const dup = await post(col1, `/collaborator/listas/${lid}/submeter`);
      expect(dup.status).toBe(409);
      expect(await subs()).toHaveLength(1);
      expect(await qtd(sid)).toEqual({ [itemId]: 8 });
      return { http: '201/409', efeito: '1 submissão PENDENTE, pedido {8}' };
    });
    await rep.step('L6 correção', 'colaborador não tem rota para editar a submissão (404/403) e nada muda', async () => {
      const a = await put(col1, `/collaborator/submissoes/${sid}`, { itens: [{ itemId, quantidadeAtual: 9 }] });
      const b = await put(col1, `/admin/submissoes/${sid}/editar`, { itens: [{ itemId, quantidadeAtual: 9 }] });
      const c = await post(col1, `/admin/submissoes/${sid}/rejeitar`);
      expect([a.status, b.status, c.status]).toEqual([404, 403, 403]);
      expect(await qtd(sid)).toEqual({ [itemId]: 8 });
      expect((await subs())[0].status).toBe('PENDENTE');
      return { http: '404/403/403', efeito: 'LACUNA registrada: colaborador não corrige PENDENTE; só ADMIN' };
    });
    await rep.step('L6 correção', 'colaborador atualiza estoque durante PENDENTE: pedidos da PENDENTE não mudam e não há nova submissão', async () => {
      const e = await put(col1, `/collaborator/listas/${lid}/estoque`, { itens: [{ itemRefId: ref.body.id, quantidadeAtual: 6 }] });
      expect(e.status).toBe(200);
      expect((await prisma.listaItemRef.findUniqueOrThrow({ where: { id: ref.body.id } })).quantidadeAtual).toBe(6);
      expect(await qtd(sid)).toEqual({ [itemId]: 8 }); // snapshot da submissão preservado
      expect(await subs()).toHaveLength(1);
      return { http: e.status, efeito: 'estoque da lista=6; pedido da submissão segue 8 (divergência até ADMIN editar/rejeitar)' };
    });
    await rep.step('L6 correção', 'ADMIN edita a PENDENTE (itens 6 -> pedido 4) sem criar submissão', async () => {
      const r = await put(adm1, `/admin/submissoes/${sid}/editar`, { itens: [{ itemId, quantidadeAtual: 6 }] });
      expect(r.status).toBe(200);
      expect(await qtd(sid)).toEqual({ [itemId]: 4 });
      expect(await subs()).toHaveLength(1);
      expect((await subs())[0]).toMatchObject({ id: sid, status: 'PENDENTE', usuarioId: col1Id });
      return { http: r.status, efeito: 'mesma submissão, pedido {4}, status PENDENTE' };
    });
    await rep.step('L6 correção', 'ADMIN rejeita => colaborador pode reenviar (nova submissão) e a rejeitada fica intacta', async () => {
      await post(adm1, `/admin/submissoes/${sid}/rejeitar`).expect(201);
      const antes = await pedidosDb(sid);
      const novo = await post(col1, `/collaborator/listas/${lid}/submeter`);
      expect(novo.status).toBe(201);
      expect(novo.body.id).not.toBe(sid);
      const todas = await subs();
      expect(todas.map((x) => x.status)).toEqual(['REJEITADO', 'PENDENTE']);
      expect((await pedidosDb(sid)).map((p) => [p.id, p.status, p.qtdSolicitada])).toEqual(antes.map((p) => [p.id, p.status, p.qtdSolicitada]));
      expect(await qtd(novo.body.id)).toEqual({ [itemId]: 4 });
      return { http: '201/201', efeito: '2 submissões: REJEITADO (intacta) + PENDENTE nova {4}' };
    });
    await rep.step('L6 correção', 'aprovada não é alterada: ADMIN aprova a nova; editar => 400; reenvio permitido sem tocar na aprovada', async () => {
      const nova = (await subs())[1];
      await post(adm1, `/admin/submissoes/${nova.id}/aprovar`).expect(201);
      const e = await put(adm1, `/admin/submissoes/${nova.id}/editar`, { itens: [{ itemId, quantidadeAtual: 0 }] });
      expect(e.status).toBe(400);
      expect(await qtd(nova.id)).toEqual({ [itemId]: 4 });
      expect((await pedidosDb(nova.id)).every((p) => p.status === 'APROVADO')).toBe(true);
      const outra = await post(col1, `/collaborator/listas/${lid}/submeter`);
      expect(outra.status).toBe(201);
      const todas = await subs();
      expect(todas.map((x) => x.status)).toEqual(['REJEITADO', 'APROVADO', 'PENDENTE']);
      expect((await pedidosDb(nova.id)).every((p) => p.status === 'APROVADO')).toBe(true);
      return { http: '201/400/201', efeito: 'aprovada preservada; 3 submissões [REJEITADO, APROVADO, PENDENTE]' };
    });
  });
});
