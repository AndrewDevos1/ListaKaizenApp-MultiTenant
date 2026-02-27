import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StatusListaRapida } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateListaRapidaDto } from './dto/create-lista-rapida.dto';
import { AddItemListaRapidaDto } from './dto/add-item-lista-rapida.dto';
import { UpdateListaRapidaItemDto } from './dto/update-lista-rapida-item.dto';

@Injectable()
export class ListasRapidasService {
  constructor(private prisma: PrismaService) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async findListaOrFail(id: number, restauranteId: number) {
    const lista = await this.prisma.listaRapida.findFirst({
      where: { id, restauranteId },
    });
    if (!lista) {
      throw new NotFoundException('Lista rápida não encontrada');
    }
    return lista;
  }

  private async findItemOrFail(itemId: number, restauranteId: number) {
    const item = await this.prisma.listaRapidaItem.findFirst({
      where: {
        id: itemId,
        listaRapida: { restauranteId },
      },
    });
    if (!item) {
      throw new NotFoundException('Item não encontrado');
    }
    return item;
  }

  // ─── Colaborador ──────────────────────────────────────────────────────────

  async create(
    restauranteId: number,
    usuarioId: number,
    dto: CreateListaRapidaDto,
  ) {
    return this.prisma.listaRapida.create({
      data: {
        restauranteId,
        usuarioId,
        nome: dto.nome,
        status: StatusListaRapida.RASCUNHO,
        itens: dto.itens
          ? {
              create: dto.itens.map((item) => ({
                nome: item.nome,
                quantidade: item.quantidade,
                unidade: item.unidade,
                itemId: item.itemId,
              })),
            }
          : undefined,
      },
      include: { itens: true },
    });
  }

  async findAllByColaborador(usuarioId: number, restauranteId: number) {
    return this.prisma.listaRapida.findMany({
      where: { usuarioId, restauranteId },
      include: { itens: true },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async findOne(id: number, restauranteId: number) {
    const lista = await this.prisma.listaRapida.findFirst({
      where: { id, restauranteId },
      include: {
        itens: true,
        usuario: { select: { id: true, nome: true, email: true } },
      },
    });
    if (!lista) {
      throw new NotFoundException('Lista rápida não encontrada');
    }
    return lista;
  }

  async submeter(id: number, usuarioId: number, restauranteId: number) {
    const lista = await this.findListaOrFail(id, restauranteId);

    if (lista.usuarioId !== usuarioId) {
      throw new ForbiddenException('Você não é o dono desta lista');
    }

    if (lista.status !== StatusListaRapida.RASCUNHO) {
      throw new BadRequestException(
        'Apenas listas em RASCUNHO podem ser submetidas',
      );
    }

    return this.prisma.listaRapida.update({
      where: { id },
      data: { status: StatusListaRapida.PENDENTE },
      include: { itens: true },
    });
  }

  async addItem(
    listaRapidaId: number,
    restauranteId: number,
    dto: AddItemListaRapidaDto,
  ) {
    const lista = await this.findListaOrFail(listaRapidaId, restauranteId);

    if (lista.status !== StatusListaRapida.RASCUNHO) {
      throw new BadRequestException(
        'Itens só podem ser adicionados a listas em RASCUNHO',
      );
    }

    return this.prisma.listaRapidaItem.create({
      data: {
        listaRapidaId,
        nome: dto.nome,
        quantidade: dto.quantidade,
        unidade: dto.unidade,
        itemId: dto.itemId,
      },
    });
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  async findAllAdmin(restauranteId: number, status?: StatusListaRapida) {
    return this.prisma.listaRapida.findMany({
      where: {
        restauranteId,
        ...(status ? { status } : {}),
      },
      include: {
        itens: true,
        usuario: { select: { id: true, nome: true, email: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async aprovar(id: number, restauranteId: number) {
    const lista = await this.findListaOrFail(id, restauranteId);

    if (lista.status !== StatusListaRapida.PENDENTE) {
      throw new BadRequestException(
        'Apenas listas PENDENTE podem ser aprovadas',
      );
    }

    return this.prisma.listaRapida.update({
      where: { id },
      data: { status: StatusListaRapida.APROVADO },
      include: { itens: true },
    });
  }

  async rejeitar(id: number, restauranteId: number) {
    const lista = await this.findListaOrFail(id, restauranteId);

    if (lista.status !== StatusListaRapida.PENDENTE) {
      throw new BadRequestException(
        'Apenas listas PENDENTE podem ser rejeitadas',
      );
    }

    return this.prisma.listaRapida.update({
      where: { id },
      data: { status: StatusListaRapida.REJEITADO },
      include: { itens: true },
    });
  }

  async arquivar(id: number, restauranteId: number) {
    await this.findListaOrFail(id, restauranteId);

    return this.prisma.listaRapida.update({
      where: { id },
      data: { status: StatusListaRapida.ARQUIVADO },
      include: { itens: true },
    });
  }

  async updateItem(
    itemId: number,
    restauranteId: number,
    dto: UpdateListaRapidaItemDto,
  ) {
    await this.findItemOrFail(itemId, restauranteId);

    return this.prisma.listaRapidaItem.update({
      where: { id: itemId },
      data: {
        ...(dto.nome !== undefined ? { nome: dto.nome } : {}),
        ...(dto.quantidade !== undefined ? { quantidade: dto.quantidade } : {}),
        ...(dto.unidade !== undefined ? { unidade: dto.unidade } : {}),
        ...(dto.itemId !== undefined ? { itemId: dto.itemId } : {}),
      },
    });
  }

  async descartar(itemId: number, restauranteId: number) {
    const item = await this.findItemOrFail(itemId, restauranteId);

    return this.prisma.listaRapidaItem.update({
      where: { id: itemId },
      data: { descartado: !item.descartado },
    });
  }
}
