import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { StatusListaRapida } from '@prisma/client';
import { ListasRapidasService } from './listas-rapidas.service';

describe('ListasRapidasService', () => {
  const makeService = () => {
    const prisma = {
      item: {
        findMany: jest.fn(),
      },
      listaRapida: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      listaRapidaItem: {
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    } as any;

    return { prisma, service: new ListasRapidasService(prisma) };
  };

  it('deve bloquear create de lista rapida com item de outro restaurante', async () => {
    const { prisma, service } = makeService();
    prisma.item.findMany.mockResolvedValue([]);

    await expect(
      service.create(10, 123, {
        nome: 'Lista invalida',
        itens: [{ nome: 'Tomate', itemId: 999 }],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.listaRapida.create).not.toHaveBeenCalled();
  });

  it('deve bloquear addItem com item de outro restaurante', async () => {
    const { prisma, service } = makeService();

    prisma.listaRapida.findFirst.mockResolvedValue({
      id: 1,
      restauranteId: 10,
      status: StatusListaRapida.RASCUNHO,
    });
    prisma.item.findMany.mockResolvedValue([]);

    await expect(
      service.addItem(1, 10, {
        nome: 'Cebola',
        itemId: 999,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.listaRapidaItem.create).not.toHaveBeenCalled();
  });

  it('deve bloquear updateItem com item de outro restaurante', async () => {
    const { prisma, service } = makeService();

    prisma.listaRapidaItem.findFirst.mockResolvedValue({
      id: 55,
      listaRapidaId: 1,
    });
    prisma.item.findMany.mockResolvedValue([]);

    await expect(
      service.updateItem(55, 10, {
        itemId: 999,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.listaRapidaItem.update).not.toHaveBeenCalled();
  });

  it('deve bloquear submissao quando usuario nao e dono da lista', async () => {
    const { prisma, service } = makeService();
    prisma.listaRapida.findFirst.mockResolvedValue({
      id: 1,
      restauranteId: 10,
      usuarioId: 999,
      status: StatusListaRapida.RASCUNHO,
    });

    await expect(service.submeter(1, 123, 10)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('deve bloquear submissao quando lista nao esta em RASCUNHO', async () => {
    const { prisma, service } = makeService();
    prisma.listaRapida.findFirst.mockResolvedValue({
      id: 1,
      restauranteId: 10,
      usuarioId: 123,
      status: StatusListaRapida.PENDENTE,
    });

    await expect(service.submeter(1, 123, 10)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('deve bloquear submissao de lista sem itens', async () => {
    const { prisma, service } = makeService();
    prisma.listaRapida.findFirst.mockResolvedValue({
      id: 1,
      restauranteId: 10,
      usuarioId: 123,
      status: StatusListaRapida.RASCUNHO,
    });
    prisma.listaRapidaItem.count.mockResolvedValue(0);

    await expect(service.submeter(1, 123, 10)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('deve submeter lista valida e atualizar status para PENDENTE', async () => {
    const { prisma, service } = makeService();
    prisma.listaRapida.findFirst.mockResolvedValue({
      id: 1,
      restauranteId: 10,
      usuarioId: 123,
      status: StatusListaRapida.RASCUNHO,
    });
    prisma.listaRapidaItem.count.mockResolvedValue(2);
    prisma.listaRapida.update.mockResolvedValue({
      id: 1,
      status: StatusListaRapida.PENDENTE,
      itens: [{ id: 1 }, { id: 2 }],
    });

    const result = await service.submeter(1, 123, 10);

    expect(prisma.listaRapida.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: StatusListaRapida.PENDENTE },
      include: { itens: true },
    });
    expect(result.status).toBe(StatusListaRapida.PENDENTE);
  });
});
