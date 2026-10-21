import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TipoClassificacaoAusencia } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ClassificarAusenciaDto } from './dto/classificar-ausencia.dto';
import { ListarAusenciasDto } from './dto/listar-ausencias.dto';

@Injectable()
export class AusenciasService {
  constructor(private readonly prisma: PrismaService) {}

  listar(restauranteId: number, filters: ListarAusenciasDto) {
    return this.prisma.classificacaoAusencia.findMany({
      where: { restauranteId, ...(filters.usuarioId ? { usuarioId: filters.usuarioId } : {}), ...(filters.tipo ? { tipo: filters.tipo } : {}) },
      include: { usuario: { select: { id: true, nome: true, email: true } }, classificadoPor: { select: { id: true, nome: true } } },
      orderBy: [{ data: 'desc' }, { atualizadoEm: 'desc' }],
    });
  }

  async classificar(restauranteId: number, adminId: number, dto: ClassificarAusenciaDto) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: dto.usuarioId, restauranteId },
      select: { id: true },
    });
    if (!usuario) throw new NotFoundException('Usuário não encontrado para este restaurante');

    const data = parseData(dto.data);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${usuario.id}, ${restauranteId})`;
      const anterior = await tx.classificacaoAusencia.findUnique({
        where: { usuarioId_restauranteId_data: { usuarioId: usuario.id, restauranteId, data } },
        select: { tipo: true },
      });
      const classificacao = await tx.classificacaoAusencia.upsert({
        where: { usuarioId_restauranteId_data: { usuarioId: usuario.id, restauranteId, data } },
        create: {
          usuarioId: usuario.id,
          restauranteId,
          data,
          tipo: dto.tipo,
          motivo: dto.motivo,
          classificadoPorId: adminId,
        },
        update: {
          tipo: dto.tipo,
          motivo: dto.motivo,
          classificadoPorId: adminId,
        },
      });
      await tx.appLog.create({
        data: {
          acao: 'CLASSIFICAR_AUSENCIA',
          entidade: 'ClassificacaoAusencia',
          entidadeId: classificacao.id,
          restauranteId,
          usuarioId: adminId,
          detalhes: { usuarioId: usuario.id, data: dto.data, tipo: dto.tipo },
        },
      });
      if (dto.tipo === TipoClassificacaoAusencia.FALTA && anterior?.tipo !== TipoClassificacaoAusencia.FALTA) {
        await tx.notificacao.create({
          data: {
            usuarioId: usuario.id,
            restauranteId,
            tipo: 'CLASSIFICACAO_FALTA',
            mensagem: `Sua ausência em ${dto.data} foi classificada como FALTA.`,
            lida: false,
          },
        });
      }
      return classificacao;
    });
  }
}

function parseData(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('Data inválida');
  const data = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(data.valueOf()) || data.toISOString().slice(0, 10) !== value) {
    throw new BadRequestException('Data inválida');
  }
  return data;
}
