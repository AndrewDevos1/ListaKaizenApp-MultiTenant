import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { TipoPonto } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RegistrarPontoDto } from './dto/registrar-ponto.dto';

const proximoTipos: Record<TipoPonto | 'INICIAL', TipoPonto[]> = {
  INICIAL: [TipoPonto.ENTRADA],
  ENTRADA: [TipoPonto.PAUSA, TipoPonto.SAIDA],
  PAUSA: [TipoPonto.RETORNO],
  RETORNO: [TipoPonto.SAIDA],
  SAIDA: [],
};

@Injectable()
export class PontoService {
  constructor(private readonly prisma: PrismaService) {}

  async registrar(usuarioId: number, restauranteId: number, dto: RegistrarPontoDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${usuarioId}, ${restauranteId})`;
      const agora = new Date();
      const registros = await tx.registroPonto.findMany({
        where: { usuarioId, restauranteId, dataOperacional: inicioDoDiaUtc(agora) },
        orderBy: [{ registradoEm: 'asc' }, { id: 'asc' }],
      });
      if (registros.length >= 4) {
        throw new BadRequestException('Limite diário de registros atingido');
      }
      const anterior = registros.at(-1)?.tipo ?? 'INICIAL';
      const disponiveis = proximoTipos[anterior];
      const tipo = dto.tipo ?? (disponiveis.length === 1 ? disponiveis[0] : undefined);
      if (!tipo || !disponiveis.includes(tipo)) {
        throw new BadRequestException('Tipo de ponto indisponível para a jornada atual');
      }
      const ultimoCriadoEm = registros.at(-1)?.registradoEm;
      if (ultimoCriadoEm && agora.valueOf() - ultimoCriadoEm.valueOf() < 60_000) {
        throw new HttpException('Aguarde antes de registrar nova batida', HttpStatus.TOO_MANY_REQUESTS);
      }
      const registro = await tx.registroPonto.create({
        data: {
          usuarioId,
          restauranteId,
          tipo,
          registradoEm: agora,
          dataOperacional: inicioDoDiaUtc(agora),
          observacoes: dto.observacoes,
        },
      });
      return {
        registro,
        tiposDisponiveis: proximoTipos[tipo],
        jornadaEncerrada: tipo === TipoPonto.SAIDA,
      };
    });
  }

  async status(usuarioId: number, restauranteId: number) {
    const registros = await this.registrosDoDia(usuarioId, restauranteId);
    const ultimoRegistro = registros.at(-1) ?? null;
    const tiposDisponiveis = proximoTipos[ultimoRegistro?.tipo ?? 'INICIAL'];
    return {
      ultimoRegistro,
      tiposDisponiveis,
      jornadaEncerrada: ultimoRegistro?.tipo === TipoPonto.SAIDA,
      registrosHoje: registros,
    };
  }

  async historico(usuarioId: number, restauranteId: number, inicio?: Date, fim?: Date) {
    if (inicio && fim && inicio > fim) {
      throw new BadRequestException('Data inicial deve ser anterior à data final');
    }
    return this.prisma.registroPonto.findMany({
      where: {
        usuarioId,
        restauranteId,
        ...(inicio || fim
          ? { dataOperacional: { ...(inicio ? { gte: inicioDoDiaUtc(inicio) } : {}), ...(fim ? { lte: fimDoDiaUtc(fim) } : {}) } }
          : {}),
      },
      orderBy: [{ registradoEm: 'desc' }, { id: 'desc' }],
    });
  }

  private registrosDoDia(usuarioId: number, restauranteId: number) {
    const inicio = inicioDoDiaUtc(new Date());
    return this.prisma.registroPonto.findMany({
      where: { usuarioId, restauranteId, dataOperacional: inicio },
      orderBy: [{ registradoEm: 'asc' }, { id: 'asc' }],
    });
  }
}

function inicioDoDiaUtc(data: Date) {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(data);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((parte) => parte.type === tipo)?.value;
  return new Date(`${valor('year')}-${valor('month')}-${valor('day')}T00:00:00.000Z`);
}

function fimDoDiaUtc(data: Date) {
  const inicio = inicioDoDiaUtc(data);
  return new Date(inicio.valueOf() + 86_400_000 - 1);
}
