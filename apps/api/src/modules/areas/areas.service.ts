import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';

@Injectable()
export class AreasService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateAreaDto, restauranteId: number) {
    return this.prisma.area.create({
      data: { ...dto, restauranteId },
    });
  }

  async findAll(restauranteId: number) {
    return this.prisma.area.findMany({
      where: { restauranteId },
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(id: number, restauranteId: number) {
    const area = await this.prisma.area.findFirst({
      where: { id, restauranteId },
    });
    if (!area) {
      throw new NotFoundException('Área não encontrada');
    }
    return area;
  }

  async update(id: number, dto: UpdateAreaDto, restauranteId: number) {
    await this.findOne(id, restauranteId);
    return this.prisma.area.update({ where: { id }, data: dto });
  }

  async remove(id: number, restauranteId: number) {
    await this.findOne(id, restauranteId);
    return this.prisma.area.delete({ where: { id } });
  }
}
