import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { StatusSubmissao } from '@prisma/client';
import { ListasService } from './listas.service';

describe('ListasService', () => {
  const makeService = () => {
    const prisma = {
      listaItemRef: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      submissao: {
        create: jest.fn(),
      },
    } as any;

    return { prisma, service: new ListasService(prisma) };
  };

  it('deve validar se todos os itemRefIds pertencem a lista informada', async () => {
    const { prisma, service } = makeService();
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 1 } as any);

    prisma.listaItemRef.findMany.mockResolvedValue([{ id: 10 }]);

    await expect(
      service.atualizarEstoque(1, 99, {
        itens: [
          { itemRefId: 10, quantidadeAtual: 2 },
          { itemRefId: 11, quantidadeAtual: 3 },
        ],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deve atualizar estoque de todos os itens validos', async () => {
    const { prisma, service } = makeService();
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 1 } as any);

    prisma.listaItemRef.findMany.mockResolvedValue([{ id: 10 }, { id: 11 }]);
    prisma.listaItemRef.update
      .mockResolvedValueOnce({ id: 10, quantidadeAtual: 2 })
      .mockResolvedValueOnce({ id: 11, quantidadeAtual: 3 });

    const result = await service.atualizarEstoque(1, 99, {
      itens: [
        { itemRefId: 10, quantidadeAtual: 2 },
        { itemRefId: 11, quantidadeAtual: 3 },
      ],
    });

    expect(prisma.listaItemRef.update).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
  });

  it('nao deve gerar submissao para item com threshold desativado', async () => {
    const { prisma, service } = makeService();
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 1 } as any);

    prisma.listaItemRef.findMany.mockResolvedValue([
      {
        id: 10,
        itemId: 100,
        quantidadeMinima: 10,
        quantidadeAtual: 0,
        usaThreshold: false,
      },
    ]);

    await expect(service.submeterLista(1, 99, 7)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(prisma.submissao.create).not.toHaveBeenCalled();
  });

  it('deve submeter somente itens com threshold ativo', async () => {
    const { prisma, service } = makeService();
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 1 } as any);

    prisma.listaItemRef.findMany.mockResolvedValue([
      {
        id: 10,
        itemId: 100,
        quantidadeMinima: 10,
        quantidadeAtual: 0,
        usaThreshold: false,
      },
      {
        id: 11,
        itemId: 101,
        quantidadeMinima: 10,
        quantidadeAtual: 2,
        usaThreshold: true,
      },
    ]);
    prisma.submissao.create.mockResolvedValue({
      id: 1,
      status: StatusSubmissao.PENDENTE,
      pedidos: [{ itemId: 101, qtdSolicitada: 8 }],
    });

    await service.submeterLista(1, 99, 7);

    expect(prisma.submissao.create).toHaveBeenCalledWith({
      data: {
        listaId: 1,
        usuarioId: 7,
        restauranteId: 99,
        status: StatusSubmissao.PENDENTE,
        pedidos: {
          create: [{ itemId: 101, qtdSolicitada: 8 }],
        },
      },
      include: {
        pedidos: {
          include: { item: true },
        },
      },
    });
  });
});
