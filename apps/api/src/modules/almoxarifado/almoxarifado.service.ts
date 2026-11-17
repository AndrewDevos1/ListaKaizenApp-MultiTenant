import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TipoMovimentacaoAlmoxarifado } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePosicaoDto } from './dto/create-posicao.dto';
import { UpdatePosicaoDto } from './dto/update-posicao.dto';
import { MovimentarDto } from './dto/movimentar.dto';

@Injectable()
export class AlmoxarifadoService {
  constructor(private readonly prisma: PrismaService) {}
  async list(restauranteId: number, busca?: string, ativo?: boolean) {
    return this.prisma.almoxarifadoPosicao.findMany({ where: { restauranteId, ...(ativo === undefined ? {} : { ativo }), ...(busca ? { item: { nome: { contains: busca, mode: 'insensitive' } } } : {}) }, include: { item: { select: { id: true, nome: true, unidadeMedida: true } } }, orderBy: { item: { nome: 'asc' } } });
  }
  async one(id: number, restauranteId: number) {
    const posicao = await this.prisma.almoxarifadoPosicao.findFirst({ where: { id, restauranteId }, include: { item: true, movimentacoes: { orderBy: { criadoEm: 'desc' } } } });
    if (!posicao) throw new NotFoundException('Posição de almoxarifado não encontrada'); return posicao;
  }
  async create(dto: CreatePosicaoDto, restauranteId: number) {
    const item = await this.prisma.item.findFirst({ where: { id: dto.itemId, restauranteId } });
    if (!item) throw new NotFoundException('Item não encontrado no restaurante');
    try { return await this.prisma.almoxarifadoPosicao.create({ data: { ...dto, restauranteId } }); } catch (e) { if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException('Já existe posição para este item'); throw e; }
  }
  async update(id: number, dto: UpdatePosicaoDto, restauranteId: number) { await this.one(id, restauranteId); return this.prisma.almoxarifadoPosicao.update({ where: { id }, data: dto }); }
  async move(id: number, dto: MovimentarDto, restauranteId: number, user: { id: number; nome: string }) {
    return this.prisma.$transaction(async tx => {
      const rows = await tx.$queryRaw<Array<{ id: number; saldo: Prisma.Decimal; ativo: boolean }>>(Prisma.sql`SELECT id, saldo, ativo FROM almoxarifado_posicoes WHERE id = ${id} AND restaurante_id = ${restauranteId} FOR UPDATE`);
      const posicao = rows[0]; if (!posicao) throw new NotFoundException('Posição de almoxarifado não encontrada');
      // Idempotência checada APÓS o lock: requisições concorrentes com a mesma chave serializam e a 2ª devolve o evento da 1ª.
      const prior = await tx.almoxarifadoMovimentacao.findUnique({ where: { restauranteId_chaveIdempotencia: { restauranteId, chaveIdempotencia: dto.chaveIdempotencia } } });
      if (prior) { if (prior.posicaoId !== id) throw new ConflictException('Chave de idempotência já usada em outra posição'); return prior; }
      if (!posicao.ativo) throw new BadRequestException('Posição inativa');
      const anterior = new Prisma.Decimal(posicao.saldo); const quantidade = new Prisma.Decimal(dto.quantidade);
      const novo = dto.tipo === TipoMovimentacaoAlmoxarifado.ENTRADA ? anterior.plus(quantidade) : dto.tipo === TipoMovimentacaoAlmoxarifado.SAIDA ? anterior.minus(quantidade) : quantidade;
      if (novo.lessThan(0)) throw new BadRequestException('Saldo insuficiente');
      await tx.almoxarifadoPosicao.update({ where: { id }, data: { saldo: novo } });
      return tx.almoxarifadoMovimentacao.create({ data: { restauranteId, posicaoId: id, itemId: (await tx.almoxarifadoPosicao.findUniqueOrThrow({ where: { id }, select: { itemId: true } })).itemId, tipo: dto.tipo, quantidade, saldoAnterior: anterior, saldoNovo: novo, motivo: dto.motivo, responsavelId: user.id, responsavelNome: user.nome, chaveIdempotencia: dto.chaveIdempotencia } });
    });
  }
}
