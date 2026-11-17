import { NotFoundException } from '@nestjs/common';
import { RestaurantesService } from './restaurantes.service';

describe('RestaurantesService módulos', () => {
  const makeService = () => {
    const prisma = {
      restaurante: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    } as any;
    return { prisma, service: new RestaurantesService(prisma) };
  };

  it('altera apenas módulos do restaurante solicitado', async () => {
    const { prisma, service } = makeService();
    prisma.restaurante.findUnique.mockResolvedValue({ id: 7 });
    prisma.restaurante.update.mockResolvedValue({ id: 7, moduloPonto: true });

    await service.updateModulos(7, { moduloPonto: true });

    expect(prisma.restaurante.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { moduloPonto: true },
    });
  });

  it('não atualiza módulos de restaurante inexistente', async () => {
    const { prisma, service } = makeService();
    prisma.restaurante.findUnique.mockResolvedValue(null);

    await expect(service.updateModulos(99, { moduloPonto: true }))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.restaurante.update).not.toHaveBeenCalled();
  });
});
