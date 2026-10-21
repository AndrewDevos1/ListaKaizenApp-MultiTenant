import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { StatusSubmissao } from '@prisma/client';
import { ListasService } from './listas.service';

describe('ListasService', () => {
  const makeService = () => {
    const prisma = {
      usuario: {
        findMany: jest.fn(),
      },
      lista: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      listaColaborador: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
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
    prisma.listaColaborador.findFirst.mockResolvedValue({ id: 1 });

    prisma.listaItemRef.findMany.mockResolvedValue([{ id: 10 }]);

    await expect(
      service.atualizarEstoque(1, 99, {
        itens: [
          { itemRefId: 10, quantidadeAtual: 2 },
          { itemRefId: 11, quantidadeAtual: 3 },
        ],
      }, 7),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deve atualizar estoque de todos os itens validos', async () => {
    const { prisma, service } = makeService();
    prisma.listaColaborador.findFirst.mockResolvedValue({ id: 1 });

    prisma.listaItemRef.findMany.mockResolvedValue([{ id: 10 }, { id: 11 }]);
    prisma.listaItemRef.update
      .mockResolvedValueOnce({ id: 10, quantidadeAtual: 2 })
      .mockResolvedValueOnce({ id: 11, quantidadeAtual: 3 });

    const result = await service.atualizarEstoque(1, 99, {
      itens: [
        { itemRefId: 10, quantidadeAtual: 2 },
        { itemRefId: 11, quantidadeAtual: 3 },
      ],
    }, 7);

    expect(prisma.listaItemRef.update).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
  });

  it('deve filtrar minhas listas pelo restaurante do token', async () => {
    const { prisma, service } = makeService();
    prisma.lista.findMany.mockResolvedValue([]);

    await service.getMinhasListas(7, 99);

    expect(prisma.lista.findMany).toHaveBeenCalledWith({
      where: {
        restauranteId: 99,
        deletado: false,
        colaboradores: { some: { usuarioId: 7 } },
      },
      include: {
        _count: { select: { itensRef: true } },
      },
      orderBy: { nome: 'asc' },
    });
  });

  it('deve bloquear vinculo de colaborador de outro restaurante', async () => {
    const { prisma, service } = makeService();
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 1 } as any);
    prisma.usuario.findMany.mockResolvedValue([]);

    await expect(service.addColaborador(1, 22, 99)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(prisma.listaColaborador.findUnique).not.toHaveBeenCalled();
    expect(prisma.listaColaborador.create).not.toHaveBeenCalled();
  });

  it('deve validar colaboradores antes de substituir atribuicoes da lista', async () => {
    const { prisma, service } = makeService();
    jest.spyOn(service, 'findOne').mockResolvedValue({ id: 1 } as any);
    prisma.usuario.findMany.mockResolvedValue([{ id: 10 }]);

    await expect(service.assign(1, [10, 11], 99)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(prisma.listaColaborador.deleteMany).not.toHaveBeenCalled();
    expect(prisma.listaColaborador.createMany).not.toHaveBeenCalled();
  });

  it('deve gerar submissao para item com threshold desativado usando regra padrao', async () => {
    const { prisma, service } = makeService();
    prisma.listaColaborador.findFirst.mockResolvedValue({ id: 1 });

    prisma.listaItemRef.findMany.mockResolvedValue([
      {
        id: 10,
        itemId: 100,
        quantidadeMinima: 10,
        quantidadeAtual: 0,
        usaThreshold: false,
      },
    ]);
    prisma.submissao.create.mockResolvedValue({
      id: 1,
      status: StatusSubmissao.PENDENTE,
      pedidos: [{ itemId: 100, qtdSolicitada: 10 }],
    });

    await service.submeterLista(1, 99, 7);

    expect(prisma.submissao.create).toHaveBeenCalledWith({
      data: {
        listaId: 1,
        usuarioId: 7,
        restauranteId: 99,
        status: StatusSubmissao.PENDENTE,
        pedidos: {
          create: [{ itemId: 100, qtdSolicitada: 10 }],
        },
      },
      include: {
        pedidos: {
          include: { item: true },
        },
      },
    });
  });

  it('deve submeter itens com e sem threshold', async () => {
    const { prisma, service } = makeService();
    prisma.listaColaborador.findFirst.mockResolvedValue({ id: 1 });

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
      pedidos: [
        { itemId: 100, qtdSolicitada: 10 },
        { itemId: 101, qtdSolicitada: 8 },
      ],
    });

    await service.submeterLista(1, 99, 7);

    expect(prisma.submissao.create).toHaveBeenCalledWith({
      data: {
        listaId: 1,
        usuarioId: 7,
        restauranteId: 99,
        status: StatusSubmissao.PENDENTE,
        pedidos: {
          create: [
            { itemId: 100, qtdSolicitada: 10 },
            { itemId: 101, qtdSolicitada: 8 },
          ],
        },
      },
      include: {
        pedidos: {
          include: { item: true },
        },
      },
    });
  });

  it('deve bloquear atualizacao de estoque para colaborador nao atribuido', async () => {
    const { prisma, service } = makeService();
    prisma.listaColaborador.findFirst.mockResolvedValue(null);

    await expect(
      service.atualizarEstoque(1, 99, {
        itens: [{ itemRefId: 10, quantidadeAtual: 2 }],
      }, 7),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.listaItemRef.findMany).not.toHaveBeenCalled();
    expect(prisma.listaItemRef.update).not.toHaveBeenCalled();
  });

  it('deve bloquear submissao para colaborador nao atribuido', async () => {
    const { prisma, service } = makeService();
    prisma.listaColaborador.findFirst.mockResolvedValue(null);

    await expect(service.submeterLista(1, 99, 7)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(prisma.listaItemRef.findMany).not.toHaveBeenCalled();
    expect(prisma.submissao.create).not.toHaveBeenCalled();
  });

  it('deve usar qtdFardo quando threshold estiver ativo e item abaixo do minimo', async () => {
    const { prisma, service } = makeService();
    prisma.listaColaborador.findFirst.mockResolvedValue({ id: 1 });

    prisma.listaItemRef.findMany.mockResolvedValue([
      {
        id: 11,
        itemId: 101,
        quantidadeMinima: 10,
        quantidadeAtual: 2,
        usaThreshold: true,
        qtdFardo: 20,
      },
    ]);
    prisma.submissao.create.mockResolvedValue({
      id: 1,
      status: StatusSubmissao.PENDENTE,
      pedidos: [{ itemId: 101, qtdSolicitada: 20 }],
    });

    await service.submeterLista(1, 99, 7);

    expect(prisma.submissao.create).toHaveBeenCalledWith({
      data: {
        listaId: 1,
        usuarioId: 7,
        restauranteId: 99,
        status: StatusSubmissao.PENDENTE,
        pedidos: {
          create: [{ itemId: 101, qtdSolicitada: 20 }],
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
