import { ConflictException, ForbiddenException } from '@nestjs/common';
import { createHash } from 'crypto';
import { AceiteTermoEpiService } from './aceite-termo-epi.service';

describe('AceiteTermoEpiService', () => {
  const prisma = { entregaEpi: { findFirst: jest.fn(), updateMany: jest.fn() }, termoResponsabilidade: { findFirst: jest.fn() }, aceiteTermoEpi: { findFirst: jest.fn(), create: jest.fn() }, entregaEpiEvento: { create: jest.fn() }, $transaction: jest.fn() } as any;
  const pdf = { generate: jest.fn() } as any;
  const service = new AceiteTermoEpiService(prisma, pdf);
  const entrega = { id: 9, funcionarioId: 7, status: 'PENDENTE', statusAceite: 'PENDENTE', funcionario: { nome: 'Ana' }, itens: [{ materialNomeSnapshot: 'Capacete', categoriaSnapshot: 'EPI', quantidade: '1', valorReferenciaSnapshot: '37.00', retornavelSnapshot: true, varianteSnapshot: '{"tamanho":"M"}' }] };
  const generated = { storageKey: 'termos/a.pdf', snapshot: '{}', snapshotHash: 'b', signatureHash: 'c', documentHash: 'd', pdfHash: 'e' };
  const payloadHash = createHash('sha256').update(JSON.stringify({ termoId: 2, assinatura: 'png' })).digest('hex');
  beforeEach(() => { jest.resetAllMocks(); prisma.$transaction.mockImplementation((fn: any) => fn(prisma)); prisma.entregaEpi.findFirst.mockResolvedValue(entrega); prisma.termoResponsabilidade.findFirst.mockResolvedValue({ id: 2, versao: '1', texto: 'Texto', hashTermo: 'a' }); pdf.generate.mockResolvedValue(generated); prisma.entregaEpi.updateMany.mockResolvedValue({ count: 1 }); prisma.aceiteTermoEpi.create.mockResolvedValue({ id: 1, hashPayload: payloadHash }); });
  it('vincula aceite ao destinatário e usa valor snapshot, sem alterar custódia', async () => {
    await expect(service.aceitar(3, 7, 9, { termoId: 2, assinatura: 'png' })).resolves.toMatchObject({ id: 1 });
    expect(pdf.generate).toHaveBeenCalledWith(expect.objectContaining({ itens: [expect.objectContaining({ valorReferencia: '37.00' })] }));
    expect(prisma.aceiteTermoEpi.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ restauranteId: 3, entregaId: 9, funcionarioId: 7, hashPayload: payloadHash }) }));
  });
  it('rejeita outra pessoa', async () => { prisma.entregaEpi.findFirst.mockResolvedValue(null); await expect(service.aceitar(3, 8, 9, { termoId: 2, assinatura: 'png' })).rejects.toBeInstanceOf(ForbiddenException); });
  it('reexecuta somente payload idêntico', async () => { prisma.aceiteTermoEpi.findFirst.mockResolvedValue({ id: 1, hashPayload: payloadHash }); await expect(service.aceitar(3, 7, 9, { termoId: 2, assinatura: 'png' })).resolves.toEqual({ id: 1, hashPayload: payloadHash }); prisma.aceiteTermoEpi.findFirst.mockResolvedValue({ id: 1, hashPayload: 'outro' }); await expect(service.aceitar(3, 7, 9, { termoId: 2, assinatura: 'png' })).rejects.toBeInstanceOf(ConflictException); });
});
