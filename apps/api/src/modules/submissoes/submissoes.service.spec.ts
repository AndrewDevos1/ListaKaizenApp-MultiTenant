import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StatusPedido, StatusSubmissao } from '@prisma/client';
import { SubmissoesService } from './submissoes.service';
import { TipoFiltroSubmissoes } from './dto/filter-submissoes.dto';

describe('SubmissoesService', () => {
  const makeService = () => {
    const prisma = {
      submissao: {
        update: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      pedido: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    } as any;

    const notificacoesService = {
      criar: jest.fn(),
    } as any;

    return { prisma, service: new SubmissoesService(prisma, notificacoesService) };
  };

  it('deve retornar erro quando pedido nao existe no restaurante', async () => {
    const { prisma, service } = makeService();
    prisma.pedido.findFirst.mockResolvedValue(null);

    await expect(
      service.updatePedidoStatus(100, 10, { status: StatusPedido.APROVADO }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deve bloquear alteracao individual de pedido nao pendente', async () => {
    const { prisma, service } = makeService();
    prisma.pedido.findFirst.mockResolvedValue({
      id: 100,
      submissaoId: 1,
      status: StatusPedido.APROVADO,
    });

    await expect(
      service.updatePedidoStatus(100, 10, { status: StatusPedido.REJEITADO }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deve atualizar pedido pendente e recalcular status da submissao', async () => {
    const { prisma, service } = makeService();
    prisma.pedido.findFirst.mockResolvedValue({
      id: 100,
      submissaoId: 1,
      status: StatusPedido.PENDENTE,
    });
    prisma.pedido.update.mockResolvedValue({
      id: 100,
      status: StatusPedido.APROVADO,
    });
    prisma.pedido.findMany.mockResolvedValue([
      { status: StatusPedido.APROVADO },
      { status: StatusPedido.APROVADO },
    ]);

    await service.updatePedidoStatus(100, 10, { status: StatusPedido.APROVADO });

    expect(prisma.pedido.update).toHaveBeenCalledWith({
      where: { id: 100 },
      data: { status: StatusPedido.APROVADO },
      include: { item: true },
    });
    expect(prisma.submissao.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: StatusSubmissao.APROVADO },
    });
  });

  it('deve permitir desfazer pedido aprovado para pendente', async () => {
    const { prisma, service } = makeService();
    prisma.pedido.findFirst.mockResolvedValue({
      id: 100,
      submissaoId: 1,
      status: StatusPedido.APROVADO,
    });
    prisma.pedido.update.mockResolvedValue({
      id: 100,
      status: StatusPedido.PENDENTE,
    });
    prisma.pedido.findMany.mockResolvedValue([
      { status: StatusPedido.PENDENTE },
      { status: StatusPedido.REJEITADO },
    ]);

    await service.updatePedidoStatus(100, 10, { status: StatusPedido.PENDENTE });

    expect(prisma.pedido.update).toHaveBeenCalledWith({
      where: { id: 100 },
      data: { status: StatusPedido.PENDENTE },
      include: { item: true },
    });
    expect(prisma.submissao.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: StatusSubmissao.PENDENTE },
    });
  });

  it('deve retornar consolidadas quando filtro tipo=CONSOLIDADAS', async () => {
    const { prisma, service } = makeService();
    prisma.submissao.findMany.mockResolvedValue([
      {
        id: 10,
        status: StatusSubmissao.APROVADO,
        criadoEm: new Date('2026-03-06T08:00:00.000Z'),
        arquivada: false,
        lista: { id: 1, nome: 'Hortifruti' },
        usuario: { id: 100, nome: 'Colab 1', email: 'c1@demo.com' },
        _count: { pedidos: 2 },
        recebimento: null,
      },
      {
        id: 11,
        status: StatusSubmissao.REJEITADO,
        criadoEm: new Date('2026-03-06T07:00:00.000Z'),
        arquivada: false,
        lista: { id: 1, nome: 'Hortifruti' },
        usuario: { id: 101, nome: 'Colab 2', email: 'c2@demo.com' },
        _count: { pedidos: 1 },
        recebimento: { id: 1, confirmadoEm: null, confirmadoAdminEm: null },
      },
    ]);

    const result = await service.findAllAdmin(10, {
      tipo: TipoFiltroSubmissoes.CONSOLIDADAS,
      arquivada: false,
    });

    const lote = result[0] as any;
    expect(result).toHaveLength(1);
    expect(lote.status).toBe('APROVADO_PARCIAL');
    expect(lote.totalSubmissoes).toBe(2);
    expect(lote.totalPedidos).toBe(3);
    expect(lote.recebidas).toBe(1);
    expect(lote.submissoesParaRecebimento).toEqual([10]);
  });

  it('deve desarquivar submissao e recalcular status', async () => {
    const { prisma, service } = makeService();
    prisma.submissao.findFirst
      .mockResolvedValueOnce({ id: 7, restauranteId: 10 }) // findSubmissaoOrFail
      .mockResolvedValueOnce({
        // findOneAdmin (retorno final)
        id: 7,
        status: StatusSubmissao.APROVADO,
        lista: { id: 1, nome: 'Lista A' },
        usuario: { id: 1, nome: 'Admin', email: 'admin@demo.com' },
        pedidos: [],
        recebimento: null,
      });
    prisma.pedido.findMany.mockResolvedValue([
      { status: StatusPedido.APROVADO },
      { status: StatusPedido.APROVADO },
    ]);

    await service.desarquivarSubmissao(7, 10);

    expect(prisma.submissao.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { arquivada: false },
    });
    expect(prisma.submissao.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { status: StatusSubmissao.APROVADO },
    });
  });
});
