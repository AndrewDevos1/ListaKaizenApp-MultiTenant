import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StatusPedido, StatusSubmissao } from '@prisma/client';
import { SubmissoesService } from './submissoes.service';

// Paridade com legado: PUT /admin/submissoes/:id/editar (services.editar_quantidades_submissao).
describe('SubmissoesService.editarSubmissao', () => {
  const ref = (itemId: number, min: number, atual: number, extra: object = {}) => ({
    id: itemId * 10, listaId: 5, itemId, quantidadeMinima: min, quantidadeAtual: atual,
    usaThreshold: false, qtdFardo: null, ...extra,
  });

  function setup(opts: { status?: StatusSubmissao; refs?: any[]; decididos?: number; submissao?: any } = {}) {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue(
        opts.submissao === null
          ? []
          : [{ id: 1, lista_id: 5, status: opts.status ?? StatusSubmissao.PENDENTE }],
      ),
      listaItemRef: { findMany: jest.fn().mockResolvedValue(opts.refs ?? []), update: jest.fn() },
      pedido: { count: jest.fn().mockResolvedValue(opts.decididos ?? 0), deleteMany: jest.fn(), createMany: jest.fn() },
    };
    const prisma: any = {
      submissao: {
        findFirst: jest.fn().mockResolvedValue(
          opts.submissao === undefined ? { id: 1, listaId: 5, restauranteId: 9, status: opts.status ?? StatusSubmissao.PENDENTE } : opts.submissao,
        ),
      },
      submissaoConsolidadaParticipante: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((fn: any) => fn(tx)),
    };
    const service = new SubmissoesService(prisma, { criar: jest.fn() } as any);
    jest.spyOn(service, 'findOneAdmin').mockResolvedValue({ id: 1 } as any);
    return { service, prisma, tx };
  }

  it('recalcula pedidos pela quantidade atual (min - atual) e ignora itens acima do mínimo', async () => {
    const { service, tx } = setup({ refs: [ref(1, 10, 10), ref(2, 8, 8), ref(3, 5, 5)] });
    await service.editarSubmissao(1, 9, { itens: [{ itemId: 1, quantidadeAtual: 4 }, { itemId: 2, quantidadeAtual: 9 }] });
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.listaItemRef.update).toHaveBeenCalledWith({ where: { id: 10 }, data: { quantidadeAtual: 4 } });
    expect(tx.pedido.deleteMany).toHaveBeenCalledWith({ where: { submissaoId: 1 } });
    expect(tx.pedido.createMany).toHaveBeenCalledWith({ data: [{ submissaoId: 1, itemId: 1, qtdSolicitada: 6 }] });
  });

  it('usa fardo quando usaThreshold e qtdFardo (mesma regra de submeterLista)', async () => {
    const { service, tx } = setup({ refs: [ref(1, 10, 10, { usaThreshold: true, qtdFardo: 12 })] });
    await service.editarSubmissao(1, 9, { itens: [{ itemId: 1, quantidadeAtual: 2 }] });
    expect(tx.pedido.createMany).toHaveBeenCalledWith({ data: [{ submissaoId: 1, itemId: 1, qtdSolicitada: 12 }] });
  });

  it('404 quando submissao nao existe no restaurante (isolamento tenant)', async () => {
    const { service, prisma } = setup({ submissao: null });
    await expect(service.editarSubmissao(1, 9, { itens: [{ itemId: 1, quantidadeAtual: 1 }] })).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it.each([StatusSubmissao.APROVADO, StatusSubmissao.REJEITADO, StatusSubmissao.PARCIAL, StatusSubmissao.ARQUIVADO])(
    'recusa submissao %s', async (status) => {
      const { service, prisma } = setup({ status });
      await expect(service.editarSubmissao(1, 9, { itens: [{ itemId: 1, quantidadeAtual: 1 }] })).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

  it('recusa item que nao pertence a lista', async () => {
    const { service, tx } = setup({ refs: [ref(1, 10, 10)] });
    await expect(service.editarSubmissao(1, 9, { itens: [{ itemId: 99, quantidadeAtual: 1 }] })).rejects.toThrow(/não pertence/);
    expect(tx.pedido.deleteMany).not.toHaveBeenCalled();
  });

  it('recusa itens duplicados', async () => {
    const { service, prisma } = setup({ refs: [ref(1, 10, 10)] });
    await expect(service.editarSubmissao(1, 9, { itens: [{ itemId: 1, quantidadeAtual: 1 }, { itemId: 1, quantidadeAtual: 2 }] })).rejects.toThrow(/duplicados/);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('nao apaga pedidos ja decididos (aprovacao parcial pendente)', async () => {
    const { service, tx } = setup({ refs: [ref(1, 10, 10)], decididos: 1 });
    await expect(service.editarSubmissao(1, 9, { itens: [{ itemId: 1, quantidadeAtual: 1 }] })).rejects.toThrow(/reverta/);
    expect(tx.pedido.deleteMany).not.toHaveBeenCalled();
    expect(StatusPedido.PENDENTE).toBeDefined();
  });

  it('recusa edicao que deixaria zero pedidos', async () => {
    const { service, tx } = setup({ refs: [ref(1, 10, 1)] });
    await expect(service.editarSubmissao(1, 9, { itens: [{ itemId: 1, quantidadeAtual: 50 }] })).rejects.toThrow(/acima do mínimo/);
    expect(tx.pedido.createMany).not.toHaveBeenCalled();
  });
});
