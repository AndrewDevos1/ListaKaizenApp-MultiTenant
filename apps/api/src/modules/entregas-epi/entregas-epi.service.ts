import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { CriarEntregaEpiDto, RecusarEntregaEpiDto } from './dto/criar-entrega-epi.dto';

@Injectable()
export class EntregasEpiService {
  constructor(private readonly prisma: PrismaService, private readonly notificacoes: NotificacoesService) {}

  async criar(restauranteId: number, criador: { id: number; role: string }, dto: CriarEntregaEpiDto) {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(criador.role)) throw new ForbiddenException();
    if (!dto.itens?.length) throw new BadRequestException('Informe ao menos um item');
    return this.prisma.$transaction(async (tx) => {
      const destinatario = await tx.usuario.findFirst({ where: { id: dto.funcionarioId, restauranteId, role: 'COLLABORATOR', ativo: true } });
      if (!destinatario) throw new NotFoundException('Destinatário não encontrado');
      const itens: any[] = [];
      for (const item of dto.itens) {
        const posicao = await tx.posicaoMaterialAlmoxarifado.findFirst({ where: { id: item.posicaoId, restauranteId, ativo: true }, include: { material: true, variante: true } });
        if (!posicao) throw new NotFoundException('Posição não encontrada');
        itens.push({ posicaoId: posicao.id, materialId: posicao.materialId, varianteId: posicao.varianteId, quantidade: item.quantidade, materialNomeSnapshot: posicao.material.nome, categoriaSnapshot: posicao.material.categoria, retornavelSnapshot: posicao.material.retornavel, varianteSnapshot: posicao.variante ? JSON.stringify(posicao.variante) : null });
      }
      let entrega: any;
      try { entrega = await tx.entregaEpi.create({ data: { restauranteId, funcionarioId: dto.funcionarioId, criadoPorId: criador.id, chaveIdempotencia: dto.chaveIdempotencia, observacoes: dto.observacoes, itens: { create: itens } } }); }
      catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return tx.entregaEpi.findFirst({ where: { restauranteId, chaveIdempotencia: dto.chaveIdempotencia }, include: { itens: true } }); throw error; }
      await tx.entregaEpiEvento.create({ data: { restauranteId, entregaId: entrega.id, tipo: 'CRIADA', atorId: criador.id, metadados: { chave: dto.chaveIdempotencia } } });
      await this.notificacoes.criarNaTransacao(tx, { usuarioId: dto.funcionarioId, restauranteId, tipo: 'ENTREGA_EPI', mensagem: 'Nova entrega de EPI disponível', referenciaId: entrega.id, deepLink: `/collaborator/entregas-epi/${entrega.id}` });
      return entrega;
    });
  }

  listar(restauranteId: number, funcionarioId?: number) { return this.prisma.entregaEpi.findMany({ where: { restauranteId, ...(funcionarioId ? { funcionarioId } : {}) }, include: { itens: true, eventos: { orderBy: { criadoEm: 'asc' } }, custodias: true }, orderBy: { criadoEm: 'desc' } }); }
  async detalhe(restauranteId: number, id: number, funcionarioId?: number) { const entrega = await this.prisma.entregaEpi.findFirst({ where: { id, restauranteId, ...(funcionarioId ? { funcionarioId } : {}) }, include: { itens: true, eventos: { orderBy: { criadoEm: 'asc' } }, custodias: true } }); if (!entrega) throw new NotFoundException('Entrega não encontrada'); return entrega; }

  async confirmarEntregaFisica(restauranteId: number, id: number, ator: { id: number; nome?: string; role: string }, chave: string) {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(ator.role)) throw new ForbiddenException();
    if (!chave?.trim()) throw new BadRequestException('Idempotency-Key obrigatório');
    return this.prisma.$transaction(async (tx) => {
      // Serializa confirmações concorrentes da mesma entrega (a 2ª vê ENTREGUE e retorna idempotente).
      await tx.$queryRaw(Prisma.sql`SELECT id FROM entregas_epi WHERE id=${id} AND restaurante_id=${restauranteId} FOR UPDATE`);
      const entrega = await tx.entregaEpi.findFirst({ where: { id, restauranteId }, include: { itens: true } });
      if (!entrega) throw new NotFoundException('Entrega não encontrada');
      if (entrega.statusFisico === 'ENTREGUE') return entrega;
      if (entrega.statusFisico !== 'PREPARADA') throw new ConflictException('Entrega não está preparada');
      const itens = [...entrega.itens].sort((a, b) => a.posicaoId - b.posicaoId);
      const locked: Record<number, any> = {};
      for (const item of itens) {
        const rows = await tx.$queryRaw<any[]>(Prisma.sql`SELECT id, saldo, material_id, variante_id FROM posicoes_material_almoxarifado WHERE id=${item.posicaoId} AND restaurante_id=${restauranteId} FOR UPDATE`);
        const p = rows[0]; if (!p) throw new NotFoundException('Posição não encontrada');
        const saldo = new Prisma.Decimal(p.saldo); if (saldo.lessThan(item.quantidade)) throw new BadRequestException('Saldo insuficiente'); locked[item.id] = { ...p, saldo };
      }
      const agora = new Date();
      for (const item of itens) {
        const p = locked[item.id]; const novo = p.saldo.minus(item.quantidade);
        await tx.posicaoMaterialAlmoxarifado.update({ where: { id: item.posicaoId }, data: { saldo: novo } });
        await tx.movimentoMaterialAlmoxarifado.create({ data: { restauranteId, posicaoId: item.posicaoId, materialId: item.materialId, varianteId: item.varianteId, tipo: 'SAIDA', quantidade: item.quantidade, saldoAnterior: p.saldo, saldoNovo: novo, motivo: `Entrega EPI #${id}`, responsavelId: ator.id, responsavelNome: ator.nome ?? String(ator.id), chaveIdempotencia: `${chave}:${item.id}` } });
        await tx.custodiaEpiItem.create({ data: { restauranteId, entregaId: id, entregaItemId: item.id, funcionarioId: entrega.funcionarioId, materialId: item.materialId, varianteId: item.varianteId, quantidadeEmPosse: item.quantidade, retornavel: item.retornavelSnapshot, iniciadaEm: agora } });
      }
      const atualizada = await tx.entregaEpi.update({ where: { id }, data: { statusFisico: 'ENTREGUE', entregueFisicamenteEm: agora, entreguePorId: ator.id, chaveEntregaFisica: chave } });
      await tx.entregaEpiEvento.create({ data: { restauranteId, entregaId: id, tipo: 'ENTREGA_FISICA_CONFIRMADA', atorId: ator.id, metadados: { chave } } });
      return atualizada;
    });
  }

  // Aceite/recusa eletrônicos são eventos do funcionário, independentes da entrega física.
  // Nunca tocam saldo nem custódia. Recusa após ENTREGUE vira DIVERGENCIA (reconciliação fica para #51).
  private async transicionar(restauranteId: number, funcionarioId: number, id: number, status: 'ACEITO' | 'RECUSADO', chaveIdempotencia: string, justificativa?: string) {
    if (status === 'RECUSADO' && !justificativa?.trim()) throw new BadRequestException('Justificativa obrigatória');
    await this.detalhe(restauranteId, id, funcionarioId);
    return this.prisma.$transaction(async (tx) => {
      const agora = new Date();
      const result = await tx.entregaEpi.updateMany({ where: { id, restauranteId, funcionarioId, status: 'PENDENTE', statusAceite: 'PENDENTE' }, data: { status, statusAceite: status, ...(status === 'ACEITO' ? { aceitoEm: agora } : { recusadoEm: agora, justificativaRecusa: justificativa }), chaveUltimaTransicao: chaveIdempotencia } });
      const atual = await tx.entregaEpi.findFirstOrThrow({ where: { id, restauranteId, funcionarioId }, include: { itens: true, eventos: { orderBy: { criadoEm: 'asc' } }, custodias: true } });
      if (!result.count) { if (atual.status === status) return atual; throw new ConflictException(atual.status === 'CANCELADO' ? 'Entrega cancelada' : 'Entrega já decidida'); }
      await tx.entregaEpiEvento.create({ data: { restauranteId, entregaId: id, tipo: status === 'ACEITO' ? 'ACEITE_ELETRONICO' : 'RECUSA', atorId: funcionarioId, metadados: { chave: chaveIdempotencia, ...(justificativa ? { justificativa } : {}) } } });
      if (status === 'RECUSADO' && atual.statusFisico === 'ENTREGUE') await tx.entregaEpiEvento.create({ data: { restauranteId, entregaId: id, tipo: 'DIVERGENCIA', atorId: funcionarioId, metadados: { motivo: 'Recusa eletrônica após entrega física confirmada', custodiaMantida: true } } });
      return this.detalheTx(tx, restauranteId, id, funcionarioId);
    });
  }
  private async detalheTx(tx: Prisma.TransactionClient, restauranteId: number, id: number, funcionarioId?: number) { return tx.entregaEpi.findFirstOrThrow({ where: { id, restauranteId, ...(funcionarioId ? { funcionarioId } : {}) }, include: { itens: true, eventos: { orderBy: { criadoEm: 'asc' } }, custodias: true } }); }
  aceitar(restauranteId: number, funcionarioId: number, id: number, chave: string) { return this.transicionar(restauranteId, funcionarioId, id, 'ACEITO', chave); }
  recusar(restauranteId: number, funcionarioId: number, id: number, dto: RecusarEntregaEpiDto) { return this.transicionar(restauranteId, funcionarioId, id, 'RECUSADO', dto.chaveIdempotencia, dto.justificativa); }

  // Cancelamento só antes da entrega física (NAO_ENTREGUE); depois, 409.
  async cancelar(restauranteId: number, id: number, ator: { id: number }, chaveIdempotencia: string) {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.entregaEpi.updateMany({ where: { id, restauranteId, status: 'PENDENTE', statusFisico: 'PREPARADA' }, data: { status: 'CANCELADO', statusFisico: 'NAO_ENTREGUE', chaveUltimaTransicao: chaveIdempotencia, canceladoEm: new Date() } });
      if (!result.count) { const e = await tx.entregaEpi.findFirst({ where: { id, restauranteId } }); if (!e) throw new NotFoundException('Entrega não encontrada'); throw new ConflictException(e.statusFisico === 'ENTREGUE' ? 'Entrega física já confirmada; não pode ser cancelada' : 'Entrega não está pendente'); }
      await tx.entregaEpiEvento.create({ data: { restauranteId, entregaId: id, tipo: 'CANCELADA', atorId: ator.id, metadados: { chave: chaveIdempotencia } } });
      return this.detalheTx(tx, restauranteId, id);
    });
  }
}
