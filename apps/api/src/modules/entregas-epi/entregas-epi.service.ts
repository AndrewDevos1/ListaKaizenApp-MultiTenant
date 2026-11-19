import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StatusEntregaEpi } from '@prisma/client';
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
        itens.push({ posicaoId: posicao.id, materialId: posicao.materialId, varianteId: posicao.varianteId, quantidade: item.quantidade, materialNomeSnapshot: posicao.material.nome, categoriaSnapshot: posicao.material.categoria, varianteSnapshot: posicao.variante ? JSON.stringify(posicao.variante) : null });
      }
      let entrega: any;
      try { entrega = await tx.entregaEpi.create({ data: { restauranteId, funcionarioId: dto.funcionarioId, criadoPorId: criador.id, chaveIdempotencia: dto.chaveIdempotencia, observacoes: dto.observacoes, itens: { create: itens } } }); }
      catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return tx.entregaEpi.findFirst({ where: { restauranteId, chaveIdempotencia: dto.chaveIdempotencia }, include: { itens: true } }); throw error; }
      await this.notificacoes.criarNaTransacao(tx, { usuarioId: dto.funcionarioId, restauranteId, tipo: 'ENTREGA_EPI', mensagem: 'Nova entrega de EPI disponível', referenciaId: entrega.id, deepLink: `/collaborator/entregas-epi/${entrega.id}` });
      return entrega;
    });
  }

  listar(restauranteId: number, funcionarioId?: number) { return this.prisma.entregaEpi.findMany({ where: { restauranteId, ...(funcionarioId ? { funcionarioId } : {}) }, include: { itens: true }, orderBy: { criadoEm: 'desc' } }); }
  async detalhe(restauranteId: number, id: number, funcionarioId?: number) { const entrega = await this.prisma.entregaEpi.findFirst({ where: { id, restauranteId, ...(funcionarioId ? { funcionarioId } : {}) }, include: { itens: true } }); if (!entrega) throw new NotFoundException('Entrega não encontrada'); return entrega; }

  private async transicionar(restauranteId: number, funcionarioId: number, id: number, status: StatusEntregaEpi, chaveIdempotencia: string, justificativa?: string) {
    if (status === 'RECUSADO' && !justificativa?.trim()) throw new BadRequestException('Justificativa obrigatória');
    const atual = await this.detalhe(restauranteId, id, funcionarioId);
    const result = await this.prisma.entregaEpi.updateMany({ where: { id, restauranteId, funcionarioId, status: 'PENDENTE' }, data: { status, ...(status === 'ACEITO' ? { aceitoEm: new Date() } : { recusadoEm: new Date(), justificativaRecusa: justificativa }), chaveUltimaTransicao: chaveIdempotencia } });
    if (!result.count) { if (atual.status === status) return atual; throw new ConflictException('Entrega já decidida'); }
    return this.detalhe(restauranteId, id, funcionarioId);
  }
  aceitar(restauranteId: number, funcionarioId: number, id: number, chave: string) { return this.transicionar(restauranteId, funcionarioId, id, 'ACEITO', chave); }
  recusar(restauranteId: number, funcionarioId: number, id: number, dto: RecusarEntregaEpiDto) { return this.transicionar(restauranteId, funcionarioId, id, 'RECUSADO', dto.chaveIdempotencia, dto.justificativa); }
  async cancelar(restauranteId: number, id: number, chaveIdempotencia: string) { const result = await this.prisma.entregaEpi.updateMany({ where: { id, restauranteId, status: 'PENDENTE' }, data: { status: 'CANCELADO', chaveUltimaTransicao: chaveIdempotencia, canceladoEm: new Date() } }); if (!result.count) throw new ConflictException('Entrega não está pendente'); return this.detalhe(restauranteId, id); }
}
