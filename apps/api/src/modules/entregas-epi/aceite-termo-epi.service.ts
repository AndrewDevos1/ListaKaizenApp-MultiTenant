import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { isAbsolute, resolve } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { TermoPdfService } from './termo-pdf.service';

@Injectable()
export class AceiteTermoEpiService {
  constructor(private readonly prisma: PrismaService, private readonly pdf: TermoPdfService) {}
  private hash(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }

  async criarTermo(restauranteId: number, criadoPorId: number, versao: string, texto: string) {
    const cleanVersion = versao?.trim();
    if (!cleanVersion || !texto?.trim()) throw new BadRequestException('Versão e texto são obrigatórios');
    const hashTermo = createHash('sha256').update(texto).digest('hex');
    return this.prisma.termoResponsabilidade.create({ data: { restauranteId, criadoPorId, versao: cleanVersion, texto, hashTermo } });
  }

  listarTermos(restauranteId: number) { return this.prisma.termoResponsabilidade.findMany({ where: { restauranteId }, orderBy: { criadoEm: 'desc' } }); }

  async aceitar(restauranteId: number, funcionarioId: number, entregaId: number, input: { termoId: number; assinatura: string; hashTermo: string; lido: boolean }) {
    if (!input?.termoId || !input.assinatura?.trim()) throw new BadRequestException('Termo e assinatura são obrigatórios');
    if (input.lido !== true) throw new BadRequestException('Confirme a leitura do termo');
    if (!/^[a-f0-9]{64}$/i.test(input.hashTermo ?? '')) throw new BadRequestException('Hash do termo inválido');
    const entrega = await this.prisma.entregaEpi.findFirst({ where: { id: entregaId, restauranteId, funcionarioId }, include: { funcionario: true, itens: true } });
    if (!entrega) throw new ForbiddenException('Entrega não pertence ao colaborador ou tenant');
    const termo = await this.prisma.termoResponsabilidade.findFirst({ where: { id: input.termoId, restauranteId } });
    if (!termo) throw new NotFoundException('Termo não encontrado');
    if (termo.hashTermo !== input.hashTermo) throw new ConflictException('O termo foi alterado; releia a versão atual');
    const payloadHash = this.hash({ termoId: termo.id, hashTermo: termo.hashTermo, lido: true, assinatura: input.assinatura.trim() });
    const existing = await this.prisma.aceiteTermoEpi.findFirst({ where: { entregaId, restauranteId, funcionarioId } });
    if (existing) {
      if (existing.hashPayload === payloadHash) return existing;
      throw new ConflictException('Entrega já possui aceite com outro payload');
    }
    if (entrega.status === 'CANCELADO' || entrega.statusAceite !== 'PENDENTE') throw new ConflictException('Entrega não está pendente');
    const aceitoEm = new Date();
    const itens = entrega.itens.map((item) => ({ nome: item.materialNomeSnapshot, categoria: String(item.categoriaSnapshot), quantidade: item.quantidade.toString(), valorReferencia: item.valorReferenciaSnapshot.toString(), condicao: item.condicaoSnapshot, variante: item.varianteSnapshot, retornavel: item.retornavelSnapshot }));
    const generated = await this.pdf.generate({ termoTexto: termo.texto, termoVersao: termo.versao, colaboradorNome: entrega.funcionario.nome, aceitoEm, itens, signature: input.assinatura });
    try {
      return await this.prisma.$transaction(async (tx) => {
        const result = await tx.entregaEpi.updateMany({ where: { id: entregaId, restauranteId, funcionarioId, status: 'PENDENTE', statusAceite: 'PENDENTE' }, data: { status: 'ACEITO', statusAceite: 'ACEITO', aceitoEm } });
        if (!result.count) {
          const replay = await tx.aceiteTermoEpi.findFirst({ where: { entregaId, restauranteId, funcionarioId } });
          if (replay?.hashPayload === payloadHash) return replay;
          throw new ConflictException('Entrega já decidida');
        }
        const aceite = await tx.aceiteTermoEpi.create({ data: { restauranteId, entregaId, termoId: termo.id, funcionarioId, snapshot: JSON.parse(generated.snapshot), hashPayload: payloadHash, hashSnapshot: generated.snapshotHash, hashAssinatura: generated.signatureHash, hashDocumento: generated.documentHash, hashPdf: generated.pdfHash, storageKey: generated.storageKey, aceitoEm } });
        await tx.entregaEpiEvento.create({ data: { restauranteId, entregaId, tipo: 'ACEITE_ELETRONICO', atorId: funcionarioId, metadados: { termoId: termo.id, aceiteId: aceite.id, hashPdf: generated.pdfHash } } });
        return aceite;
      });
    } catch (error) {
      if ((error as any)?.code !== 'P2002') throw error;
      const replay = await this.prisma.aceiteTermoEpi.findFirst({ where: { entregaId, restauranteId, funcionarioId } });
      if (replay?.hashPayload === payloadHash) return replay;
      throw new ConflictException('Entrega já possui aceite com outro payload');
    }
  }

  async obterPdf(restauranteId: number, id: number, funcionarioId?: number) {
    const aceite = await this.prisma.aceiteTermoEpi.findFirst({ where: { id, restauranteId, ...(funcionarioId ? { funcionarioId } : {}) } });
    if (!aceite) throw new NotFoundException('Comprovante não encontrado');
    const root = resolve(process.env.PRIVATE_DOCUMENT_STORAGE ?? `${process.cwd()}/private-storage`);
    const path = resolve(root, aceite.storageKey);
    if (isAbsolute(aceite.storageKey) || !path.startsWith(`${root}/`)) throw new NotFoundException('Comprovante inválido');
    const bytes = await readFile(path);
    if (createHash('sha256').update(bytes).digest('hex') !== aceite.hashPdf) throw new ConflictException('Integridade do comprovante inválida');
    return { bytes, hash: aceite.hashPdf };
  }
}
