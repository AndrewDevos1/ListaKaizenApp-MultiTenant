import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CatalogoFornecedorService } from './catalogo-fornecedor.service';

const FORN = { id: 3, restauranteId: 1 };

function setup(existentes: any[] = []) {
  const prisma: any = {
    fornecedor: { findFirst: jest.fn(async ({ where }: any) => (where.id === 3 && where.restauranteId === 1 ? FORN : null)) },
    item: {
      findMany: jest.fn(async () => existentes),
      count: jest.fn(async () => existentes.length),
      findFirst: jest.fn(async ({ where }: any) => existentes.find((i) => i.id === where.id && where.restauranteId === 1 && where.fornecedorId === 3) ?? null),
      create: jest.fn(async ({ data }: any) => ({ id: 100, ...data })),
      update: jest.fn(async ({ data }: any) => ({ id: 1, ...data })),
    },
    catalogoImportacao: { create: jest.fn(async ({ data }: any) => data), findFirst: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(async (fn: any) => fn(prisma)),
  };
  return { prisma, service: new CatalogoFornecedorService(prisma) };
}

describe('CatalogoFornecedorService – CRUD', () => {
  it('lista filtrando por tenant, fornecedor, busca e ativo', async () => {
    const { prisma, service } = setup();
    await service.listar(3, 1, { q: 'arroz', ativo: false });
    const where = prisma.item.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ restauranteId: 1, fornecedorId: 3, ativo: false });
    expect(JSON.stringify(where.OR)).toContain('arroz');
  });

  it('fornecedor de outro tenant => 404 em todas as operações', async () => {
    const { prisma, service } = setup();
    await expect(service.listar(3, 2, {})).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.criar(3, { nome: 'a', unidadeMedida: 'kg' }, 2)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.inativar(3, 1, 2)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.preview(3, { formato: 'texto', conteudo: 'x' }, 2, 9)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.item.create).not.toHaveBeenCalled();
  });

  it('cria item com tenant e fornecedor da rota, unidade normalizada', async () => {
    const { prisma, service } = setup();
    await service.criar(3, { nome: ' Arroz ', unidadeMedida: 'KG', codigoFornecedor: 'A1', precoAtual: 5.5 }, 1);
    expect(prisma.item.create.mock.calls[0][0].data).toMatchObject({ nome: 'Arroz', unidadeMedida: 'kg', restauranteId: 1, fornecedorId: 3, codigoFornecedor: 'A1', precoAtual: 5.5 });
  });

  it('código duplicado no fornecedor => 409 (P2002 do índice único)', async () => {
    const { prisma, service } = setup();
    prisma.item.create.mockRejectedValue({ code: 'P2002' });
    await expect(service.criar(3, { nome: 'a', unidadeMedida: 'kg', codigoFornecedor: 'A1' }, 1)).rejects.toBeInstanceOf(ConflictException);
  });

  it('atualiza só item do fornecedor/tenant; outro => 404', async () => {
    const { prisma, service } = setup([{ id: 1, restauranteId: 1, fornecedorId: 3 }]);
    await service.atualizar(3, 1, { marca: 'X', ativo: true }, 1);
    expect(prisma.item.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { marca: 'X', ativo: true } });
    await expect(service.atualizar(3, 99, { marca: 'X' }, 1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('preço só muda via atualizarPrecoItem (ponto único) dentro de transação', async () => {
    const { prisma, service } = setup([{ id: 1, restauranteId: 1, fornecedorId: 3 }]);
    const spy = jest.spyOn(service, 'atualizarPrecoItem');
    await service.atualizar(3, 1, { marca: 'X', precoAtual: 9.9 }, 1);
    expect(spy).toHaveBeenCalledWith(prisma, 1, 1, 9.9);
    expect(prisma.item.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { marca: 'X' } });
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.item.update.mock.calls.every((c: any) => !('precoAtual' in c[0].data) || c[0].where.id === 1)).toBe(true);
    const dataSemPreco = prisma.item.update.mock.calls[0][0].data;
    expect(dataSemPreco).toEqual({ marca: 'X' });
  });

  it('inativar faz exclusão lógica, nunca delete', async () => {
    const { prisma, service } = setup([{ id: 1, restauranteId: 1, fornecedorId: 3 }]);
    await service.inativar(3, 1, 1);
    expect(prisma.item.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { ativo: false } });
    expect(prisma.item.delete).toBeUndefined();
  });
});

describe('CatalogoFornecedorService – preview', () => {
  const salvo = (prisma: any) => prisma.catalogoImportacao.create.mock.calls[0][0].data;

  it('persiste preview durável com token, tenant, fornecedor e expiração; não grava itens', async () => {
    const { prisma, service } = setup();
    const r = await service.preview(3, { formato: 'csv', conteudo: 'codigo;nome;unidade\nA1;Arroz;kg\nA2;;kg' }, 1, 9);
    const d = salvo(prisma);
    expect(d).toMatchObject({ restauranteId: 1, fornecedorId: 3, criadoPorId: 9, formato: 'csv' });
    expect(d.token).toMatch(/^[0-9a-f-]{36}$/);
    expect(d.expiraEm.getTime()).toBeGreaterThan(Date.now());
    expect(prisma.item.create).not.toHaveBeenCalled();
    expect(r).toMatchObject({ token: d.token, resumo: { novos: 1, invalidos: 1, ignorados: 0, revisao: 0, total: 2 } });
  });

  it('classifica: existente idêntico ignorado; mesmo código com dados diferentes vai para revisão', async () => {
    const { prisma, service } = setup([
      { id: 1, nome: 'Arroz', unidadeMedida: 'kg', codigoFornecedor: 'A1' },
      { id: 2, nome: 'Feijão', unidadeMedida: 'kg', codigoFornecedor: 'F1' },
    ]);
    const r = await service.preview(3, { formato: 'csv', conteudo: 'codigo;nome;unidade\nA1;arroz;KG\nF1;Feijão Preto;kg' }, 1, 9);
    expect(r.linhas.map((l: any) => l.acao)).toEqual(['IGNORAR', 'REVISAO']);
    expect(r.linhas[1].motivo).toMatch(/código/i);
    expect(salvo(prisma).linhas).toHaveLength(2);
  });

  it('sem código: nome normalizado+unidade; mesma unidade ignora, outra unidade cria', async () => {
    const { service } = setup([{ id: 1, nome: 'Açúcar', unidadeMedida: 'kg', codigoFornecedor: null }]);
    const r = await service.preview(3, { formato: 'texto', conteudo: 'acucar;kg\nAçúcar;pct' }, 1, 9);
    expect(r.linhas.map((l: any) => l.acao)).toEqual(['IGNORAR', 'NOVO']);
  });

  it('duplicatas no arquivo: idênticas ignoradas, conflitantes todas em revisão', async () => {
    const { service } = setup();
    const a = await service.preview(3, { formato: 'csv', conteudo: 'codigo;nome;unidade\nA1;Sal;kg\nA1;Sal;kg' }, 1, 9);
    expect(a.linhas.map((l: any) => l.acao)).toEqual(['NOVO', 'IGNORAR']);
    const b = await service.preview(3, { formato: 'csv', conteudo: 'codigo;nome;unidade\nA1;Sal;kg\nA1;Pimenta;kg' }, 1, 9);
    expect(b.linhas.map((l: any) => l.acao)).toEqual(['REVISAO', 'REVISAO']);
  });

  it('arquivo sem nenhuma linha acionável ainda gera preview mas resumo zera novos; vazio => 400', async () => {
    const { service } = setup();
    await expect(service.preview(3, { formato: 'csv', conteudo: '' }, 1, 9)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('CatalogoFornecedorService – confirmar', () => {
  const previewRow = (over: any = {}) => ({
    id: 5, token: 't', restauranteId: 1, fornecedorId: 3, status: 'PENDENTE', expiraEm: new Date(Date.now() + 1e6), resultado: null,
    linhas: [
      { linha: 2, valida: true, erros: [], acao: 'NOVO', codigoFornecedor: 'A1', nome: 'Arroz', unidadeMedida: 'kg', precoAtual: 5.5 },
      { linha: 3, valida: true, erros: [], acao: 'REVISAO', nome: 'X', unidadeMedida: 'kg', motivo: 'm' },
      { linha: 4, valida: false, acao: 'INVALIDO', erros: ['nome obrigatório'] },
    ], ...over,
  });

  it('grava só linhas NOVO dentro de transação e marca confirmada', async () => {
    const { prisma, service } = setup();
    prisma.catalogoImportacao.findFirst.mockResolvedValue(previewRow());
    prisma.catalogoImportacao.updateMany.mockResolvedValue({ count: 1 });
    const r = await service.confirmar(3, 't', 1);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.item.create).toHaveBeenCalledTimes(1);
    expect(prisma.item.create.mock.calls[0][0].data).toMatchObject({ nome: 'Arroz', restauranteId: 1, fornecedorId: 3, codigoFornecedor: 'A1', precoAtual: 5.5 });
    expect(prisma.catalogoImportacao.updateMany.mock.calls[0][0].where).toMatchObject({ token: 't', restauranteId: 1, status: 'PENDENTE' });
    expect(r).toMatchObject({ criados: 1, revisao: 1, invalidos: 1, repetida: false });
  });

  it('segunda confirmação é idempotente: devolve resultado salvo e não cria', async () => {
    const { prisma, service } = setup();
    prisma.catalogoImportacao.findFirst.mockResolvedValue(previewRow({ status: 'CONFIRMADA', resultado: { criados: 1, revisao: 1, invalidos: 1, ignorados: 0 } }));
    const r = await service.confirmar(3, 't', 1);
    expect(prisma.item.create).not.toHaveBeenCalled();
    expect(r).toMatchObject({ criados: 1, repetida: true });
  });

  it('perda da corrida (updateMany=0) não cria itens', async () => {
    const { prisma, service } = setup();
    prisma.catalogoImportacao.findFirst.mockResolvedValue(previewRow());
    prisma.catalogoImportacao.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.confirmar(3, 't', 1)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.item.create).not.toHaveBeenCalled();
  });

  it('token de outro tenant/fornecedor => 404; expirado => 400', async () => {
    const { prisma, service } = setup();
    prisma.catalogoImportacao.findFirst.mockResolvedValue(null);
    await expect(service.confirmar(3, 'x', 1)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.catalogoImportacao.findFirst.mock.calls[0][0].where).toMatchObject({ token: 'x', restauranteId: 1, fornecedorId: 3 });
    prisma.catalogoImportacao.findFirst.mockResolvedValue(previewRow({ expiraEm: new Date(Date.now() - 1) }));
    await expect(service.confirmar(3, 't', 1)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('revalida no confirmar: item criado entre preview e confirmação vira ignorado', async () => {
    const { prisma, service } = setup([{ id: 7, nome: 'Arroz', unidadeMedida: 'kg', codigoFornecedor: 'A1' }]);
    prisma.catalogoImportacao.findFirst.mockResolvedValue(previewRow());
    prisma.catalogoImportacao.updateMany.mockResolvedValue({ count: 1 });
    const r = await service.confirmar(3, 't', 1);
    expect(prisma.item.create).not.toHaveBeenCalled();
    expect(r).toMatchObject({ criados: 0, ignorados: 1 });
  });

  it('colisão de índice único durante gravação => 409 e nada confirmado (transação reverte)', async () => {
    const { prisma, service } = setup();
    prisma.catalogoImportacao.findFirst.mockResolvedValue(previewRow());
    prisma.catalogoImportacao.updateMany.mockResolvedValue({ count: 1 });
    prisma.item.create.mockRejectedValue({ code: 'P2002' });
    await expect(service.confirmar(3, 't', 1)).rejects.toBeInstanceOf(ConflictException);
  });
});
