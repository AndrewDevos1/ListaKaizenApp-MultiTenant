import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateItemDto, restauranteId: number) {
    return this.prisma.item.create({
      data: { ...dto, restauranteId },
    });
  }

  async findAll(restauranteId: number, fornecedorId?: number) {
    return this.prisma.item.findMany({
      where: {
        restauranteId,
        ativo: true,
        ...(fornecedorId ? { fornecedorId } : {}),
      },
      include: { fornecedor: { select: { id: true, nome: true } } },
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(id: number, restauranteId: number) {
    const item = await this.prisma.item.findFirst({
      where: { id, restauranteId },
    });
    if (!item) {
      throw new NotFoundException('Item não encontrado');
    }
    return item;
  }

  async update(id: number, dto: UpdateItemDto, restauranteId: number) {
    await this.findOne(id, restauranteId);
    return this.prisma.item.update({ where: { id }, data: dto });
  }

  async remove(id: number, restauranteId: number) {
    await this.findOne(id, restauranteId);
    return this.prisma.item.update({
      where: { id },
      data: { ativo: false },
    });
  }

  async search(query: string, restauranteId: number) {
    return this.prisma.item.findMany({
      where: {
        restauranteId,
        ativo: true,
        nome: { contains: query, mode: 'insensitive' },
      },
      orderBy: { nome: 'asc' },
      take: 20,
    });
  }
}
