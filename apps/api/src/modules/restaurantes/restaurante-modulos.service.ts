import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RestauranteModulosService {
  constructor(private prisma: PrismaService) {}

  async findEnabled(restauranteId: number) {
    const restaurante = await this.prisma.restaurante.findUnique({
      where: { id: restauranteId },
      select: {
        moduloPonto: true,
        moduloFuncionarios: true,
        moduloAlmoxarifadoEpi: true,
      },
    });
    if (!restaurante) throw new NotFoundException('Restaurante não encontrado');
    return restaurante;
  }
}
