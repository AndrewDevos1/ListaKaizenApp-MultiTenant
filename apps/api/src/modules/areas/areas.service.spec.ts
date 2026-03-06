import { NotFoundException } from '@nestjs/common';
import { StatusSubmissao } from '@prisma/client';
import { AreasService } from './areas.service';

describe('AreasService', () => {
  const makeService = () => {
    const prisma = {
      usuario: {
        findMany: jest.fn(),
      },
      areaColaborador: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn(),
      lista: {
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
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

  it('deve bloquear setColaboradores com usuario de outro restaurante', async () => {
    const { prisma, service } = makeService();
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 1 } as any);

    prisma.usuario.findMany.mockResolvedValue([{ id: 10 }]);

    await expect(
      service.setColaboradores(
        1,
        {
          colaboradorIds: [10, 11],
        },
        99,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('deve deduplicar colaboradores validos no setColaboradores', async () => {
    const { prisma, service } = makeService();
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 1 } as any);
    jest.spyOn(service, 'getColaboradores').mockResolvedValue([{ id: 500 }] as any);

    prisma.usuario.findMany.mockResolvedValue([{ id: 10 }, { id: 11 }]);
    prisma.areaColaborador.deleteMany.mockReturnValue('delete-op');
    prisma.areaColaborador.createMany.mockReturnValue('create-op');
    prisma.$transaction.mockResolvedValue(undefined);

    const result = await service.setColaboradores(
      1,
      {
        colaboradorIds: [10, 10, 11],
      },
      99,
    );

    expect(prisma.usuario.findMany).toHaveBeenCalledWith({
      where: { id: { in: [10, 11] }, restauranteId: 99 },
      select: { id: true },
    });
    expect(prisma.areaColaborador.createMany).toHaveBeenCalledWith({
      data: [
        { areaId: 1, usuarioId: 10 },
        { areaId: 1, usuarioId: 11 },
      ],
      skipDuplicates: true,
    });
    expect(result).toEqual([{ id: 500 }]);
  });

  it('deve submeter item com threshold desativado usando regra padrao', async () => {
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
    prisma.submissao.create.mockResolvedValue({
      id: 500,
      status: StatusSubmissao.PENDENTE,
      pedidos: [{ itemId: 100, qtdSolicitada: 10 }],
    });

    const result = await service.submeterArea(1, 99, 7);

    expect(prisma.submissao.create).toHaveBeenCalledWith({
      data: {
        listaId: 10,
        usuarioId: 7,
        restauranteId: 99,
        status: StatusSubmissao.PENDENTE,
        pedidos: {
          create: [{ itemId: 100, qtdSolicitada: 10 }],
        },
      },
      include: { pedidos: { include: { item: true } } },
    });
    expect(result).toHaveLength(1);
  });

  it('deve criar submissao com itens de threshold ativo e desativado', async () => {
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
      pedidos: [
        { itemId: 100, qtdSolicitada: 10 },
        { itemId: 101, qtdSolicitada: 7 },
      ],
    });

    const result = await service.submeterArea(1, 99, 7);

    expect(prisma.submissao.create).toHaveBeenCalledWith({
      data: {
        listaId: 10,
        usuarioId: 7,
        restauranteId: 99,
        status: StatusSubmissao.PENDENTE,
        pedidos: {
          create: [
            { itemId: 100, qtdSolicitada: 10 },
            { itemId: 101, qtdSolicitada: 7 },
          ],
        },
      },
      include: { pedidos: { include: { item: true } } },
    });
    expect(result).toHaveLength(1);
  });
});
