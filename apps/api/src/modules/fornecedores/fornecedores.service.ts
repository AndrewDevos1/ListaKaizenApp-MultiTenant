import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFornecedorDto } from './dto/create-fornecedor.dto';
import { UpdateFornecedorDto } from './dto/update-fornecedor.dto';

@Injectable()
export class FornecedoresService {
  constructor(private prisma: PrismaService) {}

  async findAll(restauranteId: number, ativo?: boolean) {
    return this.prisma.fornecedor.findMany({
      where: {
        restauranteId,
        ...(ativo !== undefined ? { ativo } : {}),
      },
      include: {
        _count: { select: { itens: true } },
      },
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(id: number, restauranteId: number) {
    const fornecedor = await this.prisma.fornecedor.findFirst({
      where: { id, restauranteId },
      include: {
        itens: { select: { id: true, nome: true, unidadeMedida: true } },
      },
    });
    if (!fornecedor) {
      throw new NotFoundException('Fornecedor não encontrado');
    }
    return fornecedor;
  }

  async create(dto: CreateFornecedorDto, restauranteId: number) {
    return this.prisma.fornecedor.create({
      data: { ...dto, restauranteId },
    });
  }

  async update(id: number, dto: UpdateFornecedorDto, restauranteId: number) {
    await this.findOne(id, restauranteId);
    return this.prisma.fornecedor.update({ where: { id }, data: dto });
  }

  async remove(id: number, restauranteId: number) {
    await this.findOne(id, restauranteId);
    return this.prisma.fornecedor.update({
      where: { id },
      data: { ativo: false },
    });
  }
}
