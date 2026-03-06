import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StatusPedido, StatusSubmissao } from '@prisma/client';
import { SubmissoesService } from './submissoes.service';

describe('SubmissoesService', () => {
  const makeService = () => {
    const prisma = {
      submissao: {
        update: jest.fn(),
      },
      pedido: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    } as any;

    return { prisma, service: new SubmissoesService(prisma) };
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
});
