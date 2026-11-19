import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { PrismaService } from '../../prisma/prisma.service';
import { TermoPdfService } from './termo-pdf.service';

@Injectable()
export class AceiteTermoEpiService {
  constructor(private readonly prisma: PrismaService, private readonly pdf: TermoPdfService) {}

  async criarTermo(restauranteId: number, criadoPorId: number, versao: string, texto: string) {
    const cleanVersion = versao?.trim();
    if (!cleanVersion || !texto?.trim()) throw new BadRequestException('Versão e texto são obrigatórios');
    const hashTermo = createHash('sha256').update(texto).digest('hex');
    return this.prisma.termoResponsabilidade.create({ data: { restauranteId, criadoPorId, versao: cleanVersion, texto, hashTermo } });
  }

  listarTermos(restauranteId: number) { return this.prisma.termoResponsabilidade.findMany({ where: { restauranteId }, orderBy: { criadoEm: 'desc' } }); }

  async aceitar(restauranteId: number, funcionarioId: number, entregaId: number, input: { termoId: number; assinatura: string; }) {
    if (!input?.termoId || !input.assinatura?.trim()) throw new BadRequestException('Termo e assinatura são obrigatórios');
    const entrega = await this.prisma.entregaEpi.findFirst({ where: { id: entregaId, restauranteId, funcionarioId }, include: { funcionario: true, itens: { include: { material: true } } } });
    if (!entrega) throw new ForbiddenException('Entrega não pertence ao colaborador ou tenant');
    const existing = await this.prisma.aceiteTermoEpi.findFirst({ where: { entregaId, restauranteId, funcionarioId } });
    if (existing) return existing;
    if (entrega.status === 'CANCELADO' || (entrega.statusAceite !== undefined && entrega.statusAceite !== 'PENDENTE')) throw new ConflictException('Entrega não está pendente');
    const termo = await this.prisma.termoResponsabilidade.findFirst({ where: { id: input.termoId, restauranteId } });
    if (!termo) throw new NotFoundException('Termo não encontrado');
    const aceitoEm = new Date();
    const itens = entrega.itens.map((item) => ({ nome: item.materialNomeSnapshot, categoria: String(item.categoriaSnapshot), quantidade: item.quantidade.toString(), valorReferencia: item.material.valorReferencia.toString(), variante: item.varianteSnapshot, retornavel: item.retornavelSnapshot }));
    const generated = await this.pdf.generate({ termoTexto: termo.texto, termoVersao: termo.versao, colaboradorNome: entrega.funcionario?.nome ?? String(funcionarioId), aceitoEm, itens, signature: input.assinatura });
    try {
      return await this.prisma.$transaction(async (tx) => {
        const locked = await tx.entregaEpi.findFirst({ where: { id: entregaId, restauranteId, funcionarioId, statusAceite: 'PENDENTE' } });
        if (!locked) throw new ConflictException('Entrega já decidida');
        const aceite = await tx.aceiteTermoEpi.create({ data: { restauranteId, entregaId, termoId: termo.id, funcionarioId, snapshot: JSON.parse(generated.snapshot), hashSnapshot: generated.snapshotHash, hashAssinatura: generated.signatureHash, hashDocumento: generated.documentHash, hashPdf: generated.pdfHash, storageKey: generated.storageKey, aceitoEm } });
        await tx.entregaEpi.update({ where: { id: entregaId }, data: { status: 'ACEITO', statusAceite: 'ACEITO', aceitoEm } });
        await tx.entregaEpiEvento.create({ data: { restauranteId, entregaId, tipo: 'ACEITE_ELETRONICO', atorId: funcionarioId, metadados: { termoId: termo.id, aceiteId: aceite.id, hashPdf: generated.pdfHash } } });
        return aceite;
      });
    } catch (error) {
      if ((error as any)?.code === 'P2002') throw new ConflictException('Entrega já possui aceite');
      throw error;
    }
  }

  async obterPdf(restauranteId: number, id: number, funcionarioId?: number) {
    const aceite = await this.prisma.aceiteTermoEpi.findFirst({ where: { id, restauranteId, ...(funcionarioId ? { funcionarioId } : {}) } });
    if (!aceite) throw new NotFoundException('Comprovante não encontrado');
    const path = `${process.env.PRIVATE_DOCUMENT_STORAGE ?? `${process.cwd()}/private-storage`}/${aceite.storageKey}`;
    return { bytes: await readFile(path), hash: aceite.hashPdf };
  }
}
