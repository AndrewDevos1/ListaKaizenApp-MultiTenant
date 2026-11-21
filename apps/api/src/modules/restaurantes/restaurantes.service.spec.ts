import { NotFoundException } from '@nestjs/common';
import { RestaurantesService } from './restaurantes.service';

describe('RestaurantesService módulos', () => {
  const makeService = () => {
    const tx = {
      restaurante: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      appLog: { create: jest.fn() },
    };
    const prisma = {
      ...tx,
      $transaction: jest.fn((fn) => fn(tx)),
    } as any;
    return { prisma, service: new RestaurantesService(prisma) };
  };

  it('altera apenas módulos do restaurante solicitado', async () => {
    const { prisma, service } = makeService();
    prisma.restaurante.findUnique.mockResolvedValue({ id: 7, moduloPonto: false, moduloFuncionarios: true });
    prisma.restaurante.update.mockResolvedValue({ id: 7, moduloPonto: true });

    await service.updateModulos(7, { moduloPonto: true }, 3);

    expect(prisma.restaurante.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { moduloPonto: true },
    });
    expect(prisma.appLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        acao: 'ATUALIZAR_MODULOS_RESTAURANTE',
        entidade: 'Restaurante',
        entidadeId: 7,
      }),
    });
  });

  it('não atualiza módulos de restaurante inexistente', async () => {
    const { prisma, service } = makeService();
    prisma.restaurante.findUnique.mockResolvedValue(null);

    await expect(service.updateModulos(99, { moduloPonto: true }, 3))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.restaurante.update).not.toHaveBeenCalled();
  });
});
