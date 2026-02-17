import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRestauranteDto } from './dto/create-restaurante.dto';
import { UpdateRestauranteDto } from './dto/update-restaurante.dto';

@Injectable()
export class RestaurantesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRestauranteDto) {
    return this.prisma.restaurante.create({ data: dto });
  }

  async findAll() {
    return this.prisma.restaurante.findMany({
      include: { _count: { select: { usuarios: true } } },
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(id: number) {
    const restaurante = await this.prisma.restaurante.findUnique({
      where: { id },
      include: {
        _count: { select: { usuarios: true, items: true, listas: true } },
      },
    });
    if (!restaurante) {
      throw new NotFoundException('Restaurante não encontrado');
    }
    return restaurante;
  }

  async update(id: number, dto: UpdateRestauranteDto) {
    await this.findOne(id);
    return this.prisma.restaurante.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.restaurante.update({
      where: { id },
      data: { ativo: false },
    });
  }
}
