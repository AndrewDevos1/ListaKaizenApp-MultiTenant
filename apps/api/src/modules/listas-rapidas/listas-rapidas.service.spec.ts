import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { StatusListaRapida } from '@prisma/client';
import { ListasRapidasService } from './listas-rapidas.service';

describe('ListasRapidasService', () => {
  const makeService = () => {
    const prisma = {
      listaRapida: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      listaRapidaItem: {
        count: jest.fn(),
      },
    } as any;

    return { prisma, service: new ListasRapidasService(prisma) };
  };

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

