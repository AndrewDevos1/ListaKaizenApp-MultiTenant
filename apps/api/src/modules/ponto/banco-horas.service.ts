import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CriarLancamentoBancoHorasDto } from './dto/criar-lancamento-banco-horas.dto';

@Injectable()
export class BancoHorasService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(restauranteId: number, adminId: number, dto: CriarLancamentoBancoHorasDto) {
    const dataReferencia = parseData(dto.dataReferencia);
    if (!Number.isInteger(dto.minutosDelta) || dto.minutosDelta === 0) throw new BadRequestException('minutosDelta não pode ser zero');
    const inicio = dto.periodoInicio ? parseData(dto.periodoInicio) : undefined;
    const fim = dto.periodoFim ? parseData(dto.periodoFim) : undefined;
    if (inicio && fim && inicio > fim) throw new BadRequestException('periodoFim não pode ser anterior a periodoInicio');
    return this.prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.findFirst({ where: { id: dto.usuarioId, restauranteId, role: { in: ['ADMIN', 'COLLABORATOR'] } }, select: { id: true } });
      if (!usuario) throw new NotFoundException('Usuário não encontrado');
      const lancamento = await tx.lancamentoBancoHoras.create({ data: { usuarioId: usuario.id, restauranteId, tipo: dto.tipo, minutosDelta: dto.minutosDelta, dataReferencia, periodoInicio: inicio, periodoFim: fim, motivo: dto.motivo.trim(), criadoPorId: adminId } });
      await tx.appLog.create({ data: { acao: 'LANCAMENTO_BANCO_HORAS_CRIADO', entidade: 'LancamentoBancoHoras', entidadeId: lancamento.id, restauranteId, usuarioId: adminId, detalhes: { usuarioId: usuario.id, tipo: dto.tipo, minutosDelta: dto.minutosDelta, dataReferencia: dto.dataReferencia } } });
      return lancamento;
    });
  }

  listar(restauranteId: number, usuarioId?: number) {
    return this.prisma.lancamentoBancoHoras.findMany({ where: { restauranteId, ...(usuarioId ? { usuarioId } : {}) }, include: { usuario: { select: { id: true, nome: true } } }, orderBy: [{ dataReferencia: 'desc' }, { id: 'desc' }] });
  }
}
function parseData(value: string) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('Data inválida'); const data = new Date(`${value}T00:00:00.000Z`); if (Number.isNaN(data.valueOf()) || data.toISOString().slice(0, 10) !== value) throw new BadRequestException('Data inválida'); return data; }
