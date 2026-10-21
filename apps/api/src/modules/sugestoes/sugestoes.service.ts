import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StatusSugestao } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSugestaoDto } from './dto/create-sugestao.dto';

@Injectable()
export class SugestoesService {
  constructor(private prisma: PrismaService) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async findSugestaoOrFail(id: number, restauranteId: number) {
    const sugestao = await this.prisma.sugestaoItem.findFirst({
      where: { id, restauranteId },
    });
    if (!sugestao) {
      throw new NotFoundException('Sugestão não encontrada');
    }
    return sugestao;
  }

  // ─── Colaborador ──────────────────────────────────────────────────────────

  async create(
    restauranteId: number,
    usuarioId: number,
    dto: CreateSugestaoDto,
  ) {
    return this.prisma.sugestaoItem.create({
      data: {
        restauranteId,
        usuarioId,
        nome: dto.nome,
        unidadeMedida: dto.unidadeMedida,
        status: StatusSugestao.PENDENTE,
      },
    });
  }

  async findAllByColaborador(usuarioId: number, restauranteId: number) {
    return this.prisma.sugestaoItem.findMany({
      where: { usuarioId, restauranteId },
      include: {
        itemCriado: { select: { id: true, nome: true, unidadeMedida: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async findOne(id: number, restauranteId: number) {
    const sugestao = await this.prisma.sugestaoItem.findFirst({
      where: { id, restauranteId },
      include: {
        usuario: { select: { id: true, nome: true, email: true } },
        itemCriado: { select: { id: true, nome: true, unidadeMedida: true } },
      },
    });
    if (!sugestao) {
      throw new NotFoundException('Sugestão não encontrada');
    }
    return sugestao;
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  async findAllAdmin(restauranteId: number, status?: StatusSugestao) {
    return this.prisma.sugestaoItem.findMany({
      where: {
        restauranteId,
        ...(status ? { status } : {}),
      },
      include: {
        usuario: { select: { id: true, nome: true, email: true } },
        itemCriado: { select: { id: true, nome: true, unidadeMedida: true } },
      },
      orderBy: { criadoEm: 'desc' },
    });
  }

  async aprovar(id: number, restauranteId: number) {
    const sugestao = await this.findSugestaoOrFail(id, restauranteId);

    if (sugestao.status !== StatusSugestao.PENDENTE) {
      throw new BadRequestException(
        'Apenas sugestões PENDENTE podem ser aprovadas',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Cria item no catálogo do restaurante
      const itemCriado = await tx.item.create({
        data: {
          restauranteId,
          nome: sugestao.nome,
          unidadeMedida: sugestao.unidadeMedida,
        },
      });

      // Atualiza sugestão com status APROVADO e referência ao item criado
      return tx.sugestaoItem.update({
        where: { id },
        data: {
          status: StatusSugestao.APROVADO,
          itemCriadoId: itemCriado.id,
        },
        include: {
          usuario: { select: { id: true, nome: true, email: true } },
          itemCriado: { select: { id: true, nome: true, unidadeMedida: true } },
        },
      });
    });
  }

  async rejeitar(id: number, restauranteId: number) {
    const sugestao = await this.findSugestaoOrFail(id, restauranteId);

    if (sugestao.status !== StatusSugestao.PENDENTE) {
      throw new BadRequestException(
        'Apenas sugestões PENDENTE podem ser rejeitadas',
      );
    }

    return this.prisma.sugestaoItem.update({
      where: { id },
      data: { status: StatusSugestao.REJEITADO },
      include: {
        usuario: { select: { id: true, nome: true, email: true } },
      },
    });
  }
}
