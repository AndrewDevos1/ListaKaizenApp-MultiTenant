import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface FindLogsFilters {
  restauranteId?: number;
  usuarioId?: number;
  acao?: string;
  entidade?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class LogsService {
  constructor(private prisma: PrismaService) {}

  async registrar(
    acao: string,
    entidade?: string,
    entidadeId?: number,
    restauranteId?: number,
    usuarioId?: number,
    detalhes?: Prisma.InputJsonValue,
  ) {
    return this.prisma.appLog.create({
      data: {
        acao,
        entidade,
        entidadeId,
        restauranteId,
        usuarioId,
        detalhes,
      },
    });
  }

  async findAll(filters: FindLogsFilters = {}) {
    const {
      restauranteId,
      usuarioId,
      acao,
      entidade,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.AppLogWhereInput = {};
    if (restauranteId !== null && restauranteId !== undefined) {
      where.restauranteId = restauranteId;
    }
    if (usuarioId !== null && usuarioId !== undefined) {
      where.usuarioId = usuarioId;
    }
    if (acao) {
      where.acao = acao;
    }
    if (entidade) {
      where.entidade = entidade;
    }
    if (startDate || endDate) {
      where.criadoEm = {};
      if (startDate) where.criadoEm.gte = startDate;
      if (endDate) where.criadoEm.lte = endDate;
    }

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.appLog.findMany({
        where,
        orderBy: { criadoEm: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.appLog.count({ where }),
    ]);

    const restauranteIds = [...new Set(logs.map((log) => log.restauranteId).filter((id): id is number => !!id))];
    const usuarioIds = [...new Set(logs.map((log) => log.usuarioId).filter((id): id is number => !!id))];

    const [restaurantes, usuarios] = await Promise.all([
      restauranteIds.length > 0
        ? this.prisma.restaurante.findMany({
            where: { id: { in: restauranteIds } },
            select: { id: true, nome: true },
          })
        : [],
      usuarioIds.length > 0
        ? this.prisma.usuario.findMany({
            where: { id: { in: usuarioIds } },
            select: { id: true, nome: true },
          })
        : [],
    ]);

    const restaurantesById = new Map(restaurantes.map((r) => [r.id, r.nome]));
    const usuariosById = new Map(usuarios.map((u) => [u.id, u.nome]));

    return {
      data: logs.map((log) => ({
        ...log,
        restauranteNome: log.restauranteId ? restaurantesById.get(log.restauranteId) ?? null : null,
        usuarioNome: log.usuarioId ? usuariosById.get(log.usuarioId) ?? null : null,
      })),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }
}
