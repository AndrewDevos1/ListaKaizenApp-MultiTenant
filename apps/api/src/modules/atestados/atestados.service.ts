import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CriarAtestadoDto } from './dto/criar-atestado.dto';
import { ListarAtestadosDto } from './dto/listar-atestados.dto';

@Injectable()
export class AtestadosService {
  constructor(private readonly prisma: PrismaService) {}

  listar(restauranteId: number, filters: ListarAtestadosDto) {
    return this.prisma.atestado.findMany({
      where: { restauranteId, ...(filters.usuarioId ? { usuarioId: filters.usuarioId } : {}) },
      include: { usuario: { select: { id: true, nome: true, email: true } }, criadoPor: { select: { id: true, nome: true } } },
      orderBy: [{ inicio: 'desc' }, { criadoEm: 'desc' }],
    });
  }

  async cancelar(restauranteId: number, adminId: number, id: number) {
    const atestado = await this.prisma.atestado.findFirst({ where: { id, restauranteId }, select: { id: true, situacao: true } });
    if (!atestado) throw new NotFoundException('Atestado não encontrado para este restaurante');
    if (atestado.situacao === 'CANCELADO') return atestado;
    return this.prisma.$transaction(async (tx) => {
      const cancelado = await tx.atestado.update({ where: { id: atestado.id }, data: { situacao: 'CANCELADO' } });
      await tx.appLog.create({
        data: { acao: 'ATESTADO_CANCELADO', entidade: 'Atestado', entidadeId: atestado.id, restauranteId, usuarioId: adminId },
      });
      return cancelado;
    });
  }

  async criar(restauranteId: number, adminId: number, dto: CriarAtestadoDto) {
    const inicio = parseData(dto.inicio);
    const fim = parseData(dto.fim);
    if (inicio > fim) throw new BadRequestException('Período de atestado inválido');
    const motivo = dto.motivo.trim();
    if (!motivo) throw new BadRequestException('Motivo é obrigatório');
    const usuario = await this.prisma.usuario.findFirst({ where: { id: dto.usuarioId, restauranteId }, select: { id: true } });
    if (!usuario) throw new NotFoundException('Usuário não encontrado para este restaurante');

    return this.prisma.$transaction(async (tx) => {
      const atestado = await tx.atestado.create({
        data: { usuarioId: usuario.id, restauranteId, inicio, fim, motivo, criadoPorId: adminId },
      });
      await tx.appLog.create({
        data: {
          acao: 'ATESTADO_CRIADO', entidade: 'Atestado', entidadeId: atestado.id, restauranteId, usuarioId: adminId,
          detalhes: { usuarioId: usuario.id, inicio: dto.inicio, fim: dto.fim },
        },
      });
      return atestado;
    });
  }
}

function parseData(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('Data inválida');
  const data = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(data.valueOf()) || data.toISOString().slice(0, 10) !== value) throw new BadRequestException('Data inválida');
  return data;
}
