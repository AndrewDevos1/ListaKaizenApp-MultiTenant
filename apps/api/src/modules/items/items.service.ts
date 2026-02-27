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

  async exportarCsv(restauranteId: number): Promise<string> {
    const itens = await this.prisma.item.findMany({
      where: { restauranteId },
      include: { fornecedor: { select: { nome: true } } },
      orderBy: { nome: 'asc' },
    });

    const header = 'id,nome,unidadeMedida,ativo,fornecedor';
    const rows = itens.map((item) => {
      const fornecedor = item.fornecedor?.nome ?? '';
      return `${item.id},"${item.nome}","${item.unidadeMedida ?? ''}",${item.ativo},"${fornecedor}"`;
    });

    return [header, ...rows].join('\n');
  }
}
