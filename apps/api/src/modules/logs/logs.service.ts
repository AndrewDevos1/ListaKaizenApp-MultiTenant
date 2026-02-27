import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

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

  async findAll(restauranteId?: number, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const where = restauranteId !== null && restauranteId !== undefined
      ? { restauranteId }
      : {};

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.appLog.findMany({
        where,
        orderBy: { criadoEm: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.appLog.count({ where }),
    ]);

    return {
      data: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
