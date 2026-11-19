import { ConflictException, ForbiddenException } from '@nestjs/common';
import { AceiteTermoEpiService } from './aceite-termo-epi.service';

describe('AceiteTermoEpiService', () => {
  const prisma = { entregaEpi: { findFirst: jest.fn(), update: jest.fn() }, termoResponsabilidade: { findFirst: jest.fn() }, aceiteTermoEpi: { findFirst: jest.fn(), create: jest.fn() }, entregaEpiEvento: { create: jest.fn() }, $transaction: jest.fn() } as any;
  const pdf = { generate: jest.fn() } as any;
  const service = new AceiteTermoEpiService(prisma, pdf);
  beforeEach(() => { jest.resetAllMocks(); prisma.$transaction.mockImplementation((fn: any) => fn(prisma)); });
  it('vincula aceite ao destinatário, termo imutável e snapshot da entrega sem alterar custódia', async () => {
    prisma.entregaEpi.findFirst.mockResolvedValue({ id: 9, funcionarioId: 7, itens: [{ materialNomeSnapshot: 'Capacete', categoriaSnapshot: 'EPI', quantidade: '1', retornavelSnapshot: true, varianteSnapshot: '{"tamanho":"M"}', material: { valorReferencia: '37.00' } }] });
    prisma.termoResponsabilidade.findFirst.mockResolvedValue({ id: 2, versao: '1', texto: 'Texto', hashTermo: 'a' });
    pdf.generate.mockResolvedValue({ storageKey: 'termos/a.pdf', snapshot: '{}', termHash: 'a', snapshotHash: 'b', signatureHash: 'c', documentHash: 'd', pdfHash: 'e' });
    prisma.aceiteTermoEpi.create.mockResolvedValue({ id: 1 });
    await expect(service.aceitar(3, 7, 9, { termoId: 2, assinatura: 'png' })).resolves.toEqual({ id: 1 });
    expect(prisma.aceiteTermoEpi.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ restauranteId: 3, entregaId: 9, funcionarioId: 7, hashPdf: 'e' }) }));
  });
  it('nega outra pessoa e repetição', async () => {
    prisma.entregaEpi.findFirst.mockResolvedValue(null);
    await expect(service.aceitar(3, 8, 9, { termoId: 2, assinatura: 'png' })).rejects.toBeInstanceOf(ForbiddenException);
    prisma.entregaEpi.findFirst.mockResolvedValue({ id: 9, funcionarioId: 7, itens: [] }); prisma.aceiteTermoEpi.findFirst.mockResolvedValue({ id: 1 });
    await expect(service.aceitar(3, 7, 9, { termoId: 2, assinatura: 'png' })).rejects.toBeInstanceOf(ConflictException);
  });
});
