import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CriarEscalaDto } from './dto/criar-escala.dto';

@Injectable()
export class EscalaService {
  constructor(private readonly prisma: PrismaService) {}

  listar(restauranteId: number, usuarioId?: number) {
    return this.prisma.escalaTrabalho.findMany({
      where: { restauranteId, ...(usuarioId ? { usuarioId } : {}) },
      include: { usuario: { select: { id: true, nome: true } }, dias: { orderBy: { diaSemana: 'asc' } } },
      orderBy: [{ usuarioId: 'asc' }, { vigenciaInicio: 'desc' }],
    });
  }

  async criar(restauranteId: number, adminId: number, dto: CriarEscalaDto) {
    const inicio = parseData(dto.vigenciaInicio);
    const fim = dto.vigenciaFim ? parseData(dto.vigenciaFim) : undefined;
    if (fim && fim < inicio) throw new BadRequestException('Vigência final anterior à inicial');
    validarDias(dto.dias);

    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.findFirst({ where: { id: dto.usuarioId, restauranteId, role: { in: ['ADMIN', 'COLLABORATOR'] } }, select: { id: true } });
      if (!usuario) throw new NotFoundException('Usuário não encontrado para este restaurante');
      const conflito = await tx.escalaTrabalho.findFirst({
        where: { usuarioId: usuario.id, restauranteId, vigenciaInicio: { lte: fim ?? new Date('9999-12-31T00:00:00.000Z') }, OR: [{ vigenciaFim: null }, { vigenciaFim: { gte: inicio } }] },
        select: { id: true },
      });
      if (conflito) throw new BadRequestException('A vigência se sobrepõe a uma escala existente');
      const escala = await tx.escalaTrabalho.create({
        data: { usuarioId: usuario.id, restauranteId, nome: dto.nome.trim(), vigenciaInicio: inicio, vigenciaFim: fim, criadoPorId: adminId, dias: { create: dto.dias.map((dia) => ({ ...dia, entradaPrevista: dia.trabalha ? dia.entradaPrevista : null, saidaPrevista: dia.trabalha ? dia.saidaPrevista : null })) } },
        include: { dias: { orderBy: { diaSemana: 'asc' } } },
      });
      await tx.appLog.create({ data: { acao: 'CRIAR_ESCALA_TRABALHO', entidade: 'EscalaTrabalho', entidadeId: escala.id, restauranteId, usuarioId: adminId, detalhes: { usuarioId: usuario.id, vigenciaInicio: dto.vigenciaInicio } } });
      return escala;
    });
  }
}

function parseData(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('Data inválida');
  const data = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(data.valueOf()) || data.toISOString().slice(0, 10) !== value) throw new BadRequestException('Data inválida');
  return data;
}
function validarDias(dias: CriarEscalaDto['dias']) {
  const vistos = new Set<number>();
  for (const dia of dias) {
    if (dia.diaSemana > 6 || vistos.has(dia.diaSemana)) throw new BadRequestException('Dias da escala inválidos');
    vistos.add(dia.diaSemana);
    if (dia.trabalha && (!horaValida(dia.entradaPrevista) || !horaValida(dia.saidaPrevista) || dia.entradaPrevista! >= dia.saidaPrevista!)) throw new BadRequestException('Horários da escala inválidos');
  }
}
function horaValida(value?: string) { return !!value && /^([01]\d|2[0-3]):[0-5]\d$/.test(value); }
