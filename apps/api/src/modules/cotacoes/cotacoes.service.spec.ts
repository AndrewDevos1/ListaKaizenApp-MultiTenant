import { NotFoundException } from '@nestjs/common';
import { CotacoesService } from './cotacoes.service';

describe('CotacoesService', () => {
  const makeService = () => {
    const prisma = {
      submissao: {
        findMany: jest.fn(),
      },
      pedido: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn(),
    } as any;

    return { prisma, service: new CotacoesService(prisma) };
  };

  it('deve bloquear submissao de outro restaurante ao criar cotacao', async () => {
    const { prisma, service } = makeService();
    prisma.submissao.findMany.mockResolvedValue([{ id: 1 }]);

    await expect(
      service.create(10, {
        titulo: 'Cotacao invalida',
        submissaoIds: [1, 2],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.pedido.findMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('deve agregar pedidos aprovados por item ao criar cotacao', async () => {
    const { prisma, service } = makeService();

    prisma.submissao.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    prisma.pedido.findMany.mockResolvedValue([
      {
        itemId: 100,
        qtdSolicitada: 3,
        item: { id: 100, fornecedorId: 9 },
      },
      {
        itemId: 100,
        qtdSolicitada: 4,
        item: { id: 100, fornecedorId: 9 },
      },
    ]);

    const cotacaoCriada = {
      id: 77,
      restauranteId: 10,
      itens: [{ itemId: 100, fornecedorId: 9, qtdSolicitada: 7 }],
    };

    const tx = {
      cotacao: {
        create: jest.fn().mockResolvedValue(cotacaoCriada),
      },
    };

    prisma.$transaction.mockImplementation(async (callback: (trx: typeof tx) => Promise<any>) => callback(tx));

    const result = await service.create(10, {
      titulo: 'Cotacao semanal',
      submissaoIds: [1, 2],
    });

    expect(tx.cotacao.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          titulo: 'Cotacao semanal',
          restauranteId: 10,
          itens: {
            create: [{ itemId: 100, fornecedorId: 9, qtdSolicitada: 7 }],
          },
        }),
      }),
    );
    expect(result).toEqual(cotacaoCriada);
  });
});
