import { UnprocessableEntityException } from '@nestjs/common';
import { StatusSubmissao } from '@prisma/client';
import { AreasService } from './areas.service';

describe('AreasService', () => {
  const makeService = () => {
    const prisma = {
      lista: {
        findMany: jest.fn(),
      },
      listaItemRef: {
        findMany: jest.fn(),
      },
      submissao: {
        create: jest.fn(),
      },
    } as any;

    return { prisma, service: new AreasService(prisma) };
  };

  it('deve ignorar itens com threshold desativado ao submeter area', async () => {
    const { prisma, service } = makeService();
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 1 } as any);

    prisma.lista.findMany.mockResolvedValue([{ id: 10 }]);
    prisma.listaItemRef.findMany.mockResolvedValue([
      {
        itemId: 100,
        quantidadeMinima: 10,
        quantidadeAtual: 0,
        usaThreshold: false,
      },
    ]);

    await expect(service.submeterArea(1, 99, 7)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(prisma.submissao.create).not.toHaveBeenCalled();
  });

  it('deve criar submissao apenas com itens de threshold ativo', async () => {
    const { prisma, service } = makeService();
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 1 } as any);

    prisma.lista.findMany.mockResolvedValue([{ id: 10 }]);
    prisma.listaItemRef.findMany.mockResolvedValue([
      {
        itemId: 100,
        quantidadeMinima: 10,
        quantidadeAtual: 0,
        usaThreshold: false,
      },
      {
        itemId: 101,
        quantidadeMinima: 10,
        quantidadeAtual: 3,
        usaThreshold: true,
      },
    ]);
    prisma.submissao.create.mockResolvedValue({
      id: 500,
      status: StatusSubmissao.PENDENTE,
      pedidos: [{ itemId: 101, qtdSolicitada: 7 }],
    });

    const result = await service.submeterArea(1, 99, 7);

    expect(prisma.submissao.create).toHaveBeenCalledWith({
      data: {
        listaId: 10,
        usuarioId: 7,
        restauranteId: 99,
        status: StatusSubmissao.PENDENTE,
        pedidos: {
          create: [{ itemId: 101, qtdSolicitada: 7 }],
        },
      },
      include: { pedidos: { include: { item: true } } },
    });
    expect(result).toHaveLength(1);
  });
});

