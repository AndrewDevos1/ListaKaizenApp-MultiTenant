import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateListaDto } from './dto/create-lista.dto';
import { UpdateListaDto } from './dto/update-lista.dto';

@Injectable()
export class ListasService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateListaDto, restauranteId: number) {
    return this.prisma.lista.create({
      data: { ...dto, restauranteId },
    });
  }

  async findAll(restauranteId: number) {
    return this.prisma.lista.findMany({
      where: { restauranteId, deletado: false },
      include: {
        _count: { select: { colaboradores: true, itensRef: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async findOne(id: number, restauranteId: number) {
    const lista = await this.prisma.lista.findFirst({
      where: { id, restauranteId, deletado: false },
      include: {
        colaboradores: {
          include: { usuario: { select: { id: true, nome: true, email: true } } },
        },
        itensRef: {
          include: { item: true },
        },
      },
    });
    if (!lista) {
      throw new NotFoundException('Lista não encontrada');
    }
    return lista;
  }

  async update(id: number, dto: UpdateListaDto, restauranteId: number) {
    await this.findOne(id, restauranteId);
    return this.prisma.lista.update({ where: { id }, data: dto });
  }

  async remove(id: number, restauranteId: number) {
    await this.findOne(id, restauranteId);
    return this.prisma.lista.update({
      where: { id },
      data: { deletado: true },
    });
  }

  // Colaboradores
  async addColaborador(listaId: number, usuarioId: number, restauranteId: number) {
    await this.findOne(listaId, restauranteId);

    const existing = await this.prisma.listaColaborador.findUnique({
      where: { listaId_usuarioId: { listaId, usuarioId } },
    });
    if (existing) {
      throw new ConflictException('Colaborador já vinculado a esta lista');
    }

    return this.prisma.listaColaborador.create({
      data: { listaId, usuarioId },
      include: { usuario: { select: { id: true, nome: true, email: true } } },
    });
  }

  async removeColaborador(listaId: number, usuarioId: number, restauranteId: number) {
    await this.findOne(listaId, restauranteId);

    const record = await this.prisma.listaColaborador.findUnique({
      where: { listaId_usuarioId: { listaId, usuarioId } },
    });
    if (!record) {
      throw new NotFoundException('Colaborador não vinculado a esta lista');
    }

    return this.prisma.listaColaborador.delete({
      where: { id: record.id },
    });
  }

  // Item refs
  async addItemRef(
    listaId: number,
    itemId: number,
    quantidadeMinima: number,
    restauranteId: number,
  ) {
    await this.findOne(listaId, restauranteId);

    const existing = await this.prisma.listaItemRef.findUnique({
      where: { listaId_itemId: { listaId, itemId } },
    });
    if (existing) {
      throw new ConflictException('Item já está nesta lista');
    }

    return this.prisma.listaItemRef.create({
      data: { listaId, itemId, quantidadeMinima },
      include: { item: true },
    });
  }

  async removeItemRef(listaId: number, itemId: number, restauranteId: number) {
    await this.findOne(listaId, restauranteId);

    const record = await this.prisma.listaItemRef.findUnique({
      where: { listaId_itemId: { listaId, itemId } },
    });
    if (!record) {
      throw new NotFoundException('Item não está nesta lista');
    }

    return this.prisma.listaItemRef.delete({
      where: { id: record.id },
    });
  }

  async getListaItens(listaId: number, restauranteId: number) {
    await this.findOne(listaId, restauranteId);

    return this.prisma.listaItemRef.findMany({
      where: { listaId },
      include: { item: true },
      orderBy: { item: { nome: 'asc' } },
    });
  }

  // Collaborator: minhas listas
  async getMinhasListas(userId: number) {
    return this.prisma.lista.findMany({
      where: {
        deletado: false,
        colaboradores: { some: { usuarioId: userId } },
      },
      include: {
        _count: { select: { itensRef: true } },
      },
      orderBy: { nome: 'asc' },
    });
  }
}
