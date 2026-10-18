import { NotFoundException } from '@nestjs/common';
import { RestauranteModulosService } from './restaurante-modulos.service';

describe('RestauranteModulosService', () => {
  it('retorna somente flags do restaurante solicitado', async () => {
    const prisma = {
      restaurante: { findUnique: jest.fn().mockResolvedValue({ moduloPonto: false }) },
    } as any;
    const service = new RestauranteModulosService(prisma);

    await expect(service.findEnabled(12)).resolves.toEqual({ moduloPonto: false });
    expect(prisma.restaurante.findUnique).toHaveBeenCalledWith({
      where: { id: 12 },
      select: {
        moduloPonto: true,
        moduloFuncionarios: true,
        moduloAlmoxarifadoEpi: true,
      },
    });
  });

  it('não transforma restaurante ausente em módulos habilitados', async () => {
    const prisma = { restaurante: { findUnique: jest.fn().mockResolvedValue(null) } } as any;
    const service = new RestauranteModulosService(prisma);

    await expect(service.findEnabled(12)).rejects.toBeInstanceOf(NotFoundException);
  });
});
