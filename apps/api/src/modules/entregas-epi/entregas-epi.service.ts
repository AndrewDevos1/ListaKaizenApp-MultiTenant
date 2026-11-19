import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { CriarEntregaEpiDto, RecusarEntregaEpiDto } from './dto/criar-entrega-epi.dto';

@Injectable()
export class EntregasEpiService {
  private hash(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
  private normalized(value?: string) { return value?.trim().replace(/\s+/g, ' ') || ''; }
  constructor(private readonly prisma: PrismaService, private readonly notificacoes: NotificacoesService) {}

  async criar(restauranteId: number, criador: { id: number; role: string }, dto: CriarEntregaEpiDto) {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(criador.role)) throw new ForbiddenException();
    if (!dto.itens?.length) throw new BadRequestException('Informe ao menos um item');
    const hashCriacao = this.hash({ funcionarioId: dto.funcionarioId, observacoes: this.normalized(dto.observacoes), itens: dto.itens.map((item) => ({ posicaoId: item.posicaoId, quantidade: String(item.quantidade) })).sort((a, b) => a.posicaoId - b.posicaoId || a.quantidade.localeCompare(b.quantidade)) });
    const existente = await this.prisma.entregaEpi.findFirst({ where: { restauranteId, chaveIdempotencia: dto.chaveIdempotencia }, include: { itens: true } });
    if (existente) {
      if (existente.hashCriacao === hashCriacao) return existente;
      throw new ConflictException('Chave de idempotência já usada com payload diferente');
    }
    try { return await this.prisma.$transaction(async (tx) => {
      const destinatario = await tx.usuario.findFirst({ where: { id: dto.funcionarioId, restauranteId, role: 'COLLABORATOR', ativo: true } });
      if (!destinatario) throw new NotFoundException('Destinatário não encontrado');
      const itens: any[] = [];
      for (const item of dto.itens) {
        const posicao = await tx.posicaoMaterialAlmoxarifado.findFirst({ where: { id: item.posicaoId, restauranteId, ativo: true }, include: { material: true, variante: true } });
        if (!posicao) throw new NotFoundException('Posição não encontrada');
        itens.push({ posicaoId: posicao.id, materialId: posicao.materialId, varianteId: posicao.varianteId, quantidade: item.quantidade, materialNomeSnapshot: posicao.material.nome, categoriaSnapshot: posicao.material.categoria, retornavelSnapshot: posicao.material.retornavel, varianteSnapshot: posicao.variante ? JSON.stringify(posicao.variante) : null });
      }
      const entrega = await tx.entregaEpi.create({ data: { restauranteId, funcionarioId: dto.funcionarioId, criadoPorId: criador.id, chaveIdempotencia: dto.chaveIdempotencia, hashCriacao, observacoes: this.normalized(dto.observacoes) || null, itens: { create: itens } } });
      await tx.entregaEpiEvento.create({ data: { restauranteId, entregaId: entrega.id, tipo: 'CRIADA', atorId: criador.id, metadados: { chave: dto.chaveIdempotencia } } });
      await this.notificacoes.criarNaTransacao(tx, { usuarioId: dto.funcionarioId, restauranteId, tipo: 'ENTREGA_EPI', mensagem: 'Nova entrega de EPI disponível', referenciaId: entrega.id, deepLink: `/collaborator/entregas-epi/${entrega.id}` });
      return entrega;
    }); } catch (error) {
      if ((error as any)?.code !== 'P2002') throw error;
      const concorrente = await this.prisma.entregaEpi.findFirst({ where: { restauranteId, chaveIdempotencia: dto.chaveIdempotencia }, include: { itens: true } });
      if (concorrente?.hashCriacao === hashCriacao) return concorrente;
      throw new ConflictException('Chave de idempotência já usada com payload diferente');
    }
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
      if (entrega.statusFisico === 'ENTREGUE') {
        if (entrega.chaveEntregaFisica === chave) return entrega;
        throw new ConflictException('Chave de idempotência já usada com outra confirmação');
      }
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
    if (!chaveIdempotencia?.trim()) throw new BadRequestException('Idempotency-Key obrigatório');
    if (status === 'RECUSADO' && !justificativa?.trim()) throw new BadRequestException('Justificativa obrigatória');
    const hashTransicao = this.hash({ status, justificativa: this.normalized(justificativa) });
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM entregas_epi WHERE id=${id} AND restaurante_id=${restauranteId} FOR UPDATE`);
      const agora = new Date();
      const result = await tx.entregaEpi.updateMany({ where: { id, restauranteId, funcionarioId, status: 'PENDENTE', statusAceite: 'PENDENTE' }, data: { status, statusAceite: status, ...(status === 'ACEITO' ? { aceitoEm: agora } : { recusadoEm: agora, justificativaRecusa: justificativa }), chaveUltimaTransicao: chaveIdempotencia, hashUltimaTransicao: hashTransicao } });
      const atual = await tx.entregaEpi.findFirst({ where: { id, restauranteId, funcionarioId }, include: { itens: true, eventos: { orderBy: { criadoEm: 'asc' } }, custodias: true } });
      if (!atual) throw new NotFoundException('Entrega não encontrada');
      if (!result.count) { if (atual.chaveUltimaTransicao === chaveIdempotencia && atual.hashUltimaTransicao === hashTransicao) return atual; if (atual.chaveUltimaTransicao === chaveIdempotencia) throw new ConflictException('Chave de idempotência já usada com payload diferente'); throw new ConflictException(atual.status === 'CANCELADO' ? 'Entrega cancelada' : 'Entrega já decidida'); }
      await tx.entregaEpiEvento.create({ data: { restauranteId, entregaId: id, tipo: status === 'ACEITO' ? 'ACEITE_ELETRONICO' : 'RECUSA', atorId: funcionarioId, metadados: { chave: chaveIdempotencia, ...(justificativa ? { justificativa } : {}) } } });
      if (status === 'RECUSADO' && atual.statusFisico === 'ENTREGUE') await tx.entregaEpiEvento.create({ data: { restauranteId, entregaId: id, tipo: 'DIVERGENCIA', atorId: funcionarioId, metadados: { motivo: 'Recusa eletrônica após entrega física confirmada', custodiaMantida: true } } });
      return this.detalheTx(tx, restauranteId, id, funcionarioId);
    });
  }
  private async detalheTx(tx: Prisma.TransactionClient, restauranteId: number, id: number, funcionarioId?: number) { return tx.entregaEpi.findFirstOrThrow({ where: { id, restauranteId, ...(funcionarioId ? { funcionarioId } : {}) }, include: { itens: true, eventos: { orderBy: { criadoEm: 'asc' } }, custodias: true } }); }
  aceitar(restauranteId: number, funcionarioId: number, id: number, chave: string) { return this.transicionar(restauranteId, funcionarioId, id, 'ACEITO', chave); }
  recusar(restauranteId: number, funcionarioId: number, id: number, dto: RecusarEntregaEpiDto) { return this.transicionar(restauranteId, funcionarioId, id, 'RECUSADO', dto.chaveIdempotencia, dto.justificativa); }

  async devolver(restauranteId: number, ator: { id: number; nome?: string; role: string }, custodiaId: number, dto: { quantidade: number; condicao: 'REUTILIZAVEL' | 'DANIFICADO' | 'INUTILIZADO' | 'OUTRA'; chaveIdempotencia: string; observacao?: string }) {
    if (!['ADMIN', 'SUPER_ADMIN', 'COLLABORATOR'].includes(ator.role)) throw new ForbiddenException();
    if (!dto.chaveIdempotencia?.trim()) throw new BadRequestException('Idempotency-Key obrigatório');
    if (dto.quantidade <= 0) throw new BadRequestException('Quantidade inválida');
    const hashPayload = this.hash({ quantidade: String(dto.quantidade), condicao: dto.condicao, observacao: this.normalized(dto.observacao) });
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.devolucaoEpi?.findUnique?.({ where: { restauranteId_chaveIdempotencia: { restauranteId, chaveIdempotencia: dto.chaveIdempotencia } } });
      if (previous) { if (previous.hashPayload === hashPayload) return previous; throw new ConflictException('Chave de idempotência já usada com payload diferente'); }
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`SELECT id, entrega_id, entrega_item_id, funcionario_id, material_id, variante_id, quantidade_em_posse, retornavel FROM custodias_epi_itens WHERE id=${custodiaId} AND restaurante_id=${restauranteId} FOR UPDATE`);
      const c = rows[0]; if (!c) throw new NotFoundException('Custódia não encontrada');
      if (ator.role === 'COLLABORATOR' && c.funcionario_id !== ator.id) throw new ForbiddenException();
      const posse = new Prisma.Decimal(c.quantidade_em_posse), quantidade = new Prisma.Decimal(dto.quantidade);
      if (!c.retornavel) throw new BadRequestException('Item não retornável');
      if (quantidade.greaterThan(posse)) throw new BadRequestException('Quantidade maior que a posse');
      const item = await tx.entregaEpiItem.findUnique({ where: { id: c.entrega_item_id } });
      if (!item) throw new NotFoundException('Item da entrega não encontrado');
      await tx.custodiaEpiItem.update({ where: { id: custodiaId }, data: { quantidadeEmPosse: posse.minus(quantidade) } });
      if (dto.condicao === 'REUTILIZAVEL') {
        const p = (await tx.$queryRaw<any[]>(Prisma.sql`SELECT id, saldo FROM posicoes_material_almoxarifado WHERE id=${c.posicao_id ?? item.posicaoId} AND restaurante_id=${restauranteId} FOR UPDATE`))[0];
        if (!p) throw new NotFoundException('Posição não encontrada');
        const anterior = new Prisma.Decimal(p.saldo), novo = anterior.plus(quantidade);
        await tx.posicaoMaterialAlmoxarifado.update({ where: { id: p.id }, data: { saldo: novo } });
        await tx.movimentoMaterialAlmoxarifado.create({ data: { restauranteId, posicaoId: p.id, materialId: c.material_id, varianteId: c.variante_id, tipo: 'ENTRADA', quantidade, saldoAnterior: anterior, saldoNovo: novo, motivo: `Devolução EPI #${c.entrega_id}`, responsavelId: ator.id, responsavelNome: ator.nome ?? String(ator.id), chaveIdempotencia: `${dto.chaveIdempotencia}:entrada` } });
      }
      const result = await tx.devolucaoEpi.create({ data: { restauranteId, custodiaId, entregaId: c.entrega_id, quantidade, condicao: dto.condicao, observacao: this.normalized(dto.observacao) || null, chaveIdempotencia: dto.chaveIdempotencia, hashPayload, criadoPorId: ator.id } });
      await tx.entregaEpiEvento.create({ data: { restauranteId, entregaId: c.entrega_id, tipo: 'DEVOLUCAO', atorId: ator.id, metadados: { custodiaId, quantidade: String(quantidade), condicao: dto.condicao, chaveIdempotencia: dto.chaveIdempotencia } } });
      return result;
    });
  }

  async registrarOcorrencia(restauranteId: number, ator: { id: number; nome?: string; role: string }, custodiaId: number, dto: { quantidade: number; tipo: 'PERDA' | 'DANO' | 'BAIXA_ADMINISTRATIVA'; descricao: string; chaveIdempotencia: string }) {
    if (!['ADMIN', 'SUPER_ADMIN', 'COLLABORATOR'].includes(ator.role)) throw new ForbiddenException();
    if (!dto.chaveIdempotencia?.trim() || !dto.descricao?.trim()) throw new BadRequestException('Chave e descrição obrigatórias');
    if (dto.quantidade <= 0) throw new BadRequestException('Quantidade inválida');
    const hashPayload = this.hash({ quantidade: String(dto.quantidade), tipo: dto.tipo, descricao: this.normalized(dto.descricao) });
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.ocorrenciaEpi.findUnique({ where: { restauranteId_chaveIdempotencia: { restauranteId, chaveIdempotencia: dto.chaveIdempotencia } } });
      if (previous) { if (previous.hashPayload === hashPayload) return previous; throw new ConflictException('Chave de idempotência já usada com payload diferente'); }
      const rows = await tx.$queryRaw<any[]>(Prisma.sql`SELECT id, entrega_id, funcionario_id, material_id, variante_id, quantidade_em_posse FROM custodias_epi_itens WHERE id=${custodiaId} AND restaurante_id=${restauranteId} FOR UPDATE`);
      const c = rows[0]; if (!c) throw new NotFoundException('Custódia não encontrada');
      if (ator.role === 'COLLABORATOR' && c.funcionario_id !== ator.id) throw new ForbiddenException();
      const posse = new Prisma.Decimal(c.quantidade_em_posse), quantidade = new Prisma.Decimal(dto.quantidade);
      if (quantidade.greaterThan(posse)) throw new BadRequestException('Quantidade maior que a posse');
      const result = await tx.ocorrenciaEpi.create({ data: { restauranteId, custodiaId, entregaId: c.entrega_id, tipo: dto.tipo, quantidade, descricao: this.normalized(dto.descricao), chaveIdempotencia: dto.chaveIdempotencia, hashPayload, criadoPorId: ator.id } });
      await tx.custodiaEpiItem.update({ where: { id: custodiaId }, data: { quantidadeEmPosse: posse.minus(quantidade) } });
      await tx.entregaEpiEvento.create({ data: { restauranteId, entregaId: c.entrega_id, tipo: dto.tipo === 'BAIXA_ADMINISTRATIVA' ? 'BAIXA_ADMINISTRATIVA' : 'OCORRENCIA_PERDA_DANO', atorId: ator.id, metadados: { custodiaId, quantidade: String(quantidade), tipo: dto.tipo, chaveIdempotencia: dto.chaveIdempotencia } } });
      return result;
    });
  }

  // Cancelamento só antes da entrega física (NAO_ENTREGUE); depois, 409.
  async cancelar(restauranteId: number, id: number, ator: { id: number }, chaveIdempotencia: string) {
    if (!chaveIdempotencia?.trim()) throw new BadRequestException('Idempotency-Key obrigatório');
    const hashTransicao = this.hash({ status: 'CANCELADO', justificativa: '' });
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.entregaEpi.updateMany({ where: { id, restauranteId, status: 'PENDENTE', statusFisico: 'PREPARADA' }, data: { status: 'CANCELADO', statusFisico: 'NAO_ENTREGUE', chaveUltimaTransicao: chaveIdempotencia, hashUltimaTransicao: hashTransicao, canceladoEm: new Date() } });
      if (!result.count) { const e = await tx.entregaEpi.findFirst({ where: { id, restauranteId } }); if (!e) throw new NotFoundException('Entrega não encontrada'); if (e.chaveUltimaTransicao === chaveIdempotencia && e.hashUltimaTransicao === hashTransicao) return this.detalheTx(tx, restauranteId, id); if (e.chaveUltimaTransicao === chaveIdempotencia) throw new ConflictException('Chave de idempotência já usada com payload diferente'); throw new ConflictException(e.statusFisico === 'ENTREGUE' ? 'Entrega física já confirmada; não pode ser cancelada' : 'Entrega não está pendente'); }
      await tx.entregaEpiEvento.create({ data: { restauranteId, entregaId: id, tipo: 'CANCELADA', atorId: ator.id, metadados: { chave: chaveIdempotencia } } });
      return this.detalheTx(tx, restauranteId, id);
    });
  }
}
