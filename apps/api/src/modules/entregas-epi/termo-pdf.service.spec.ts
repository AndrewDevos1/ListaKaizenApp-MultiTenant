import { createHash } from 'crypto';
import { TermoPdfService } from './termo-pdf.service';

describe('TermoPdfService', () => {
  it('gera PDF verdadeiro com texto, assinatura PNG e hashes determinísticos', async () => {
    const service = new TermoPdfService('/tmp/kaizen-termo-test');
    const signature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const result = await service.generate({
      termoTexto: 'Declaro responsabilidade pelos materiais recebidos.',
      termoVersao: '2026.1',
      colaboradorNome: 'Ana',
      aceitoEm: new Date('2026-11-19T12:00:00.000Z'),
      itens: [{ nome: 'Capacete', categoria: 'EPI', quantidade: '1', valorReferencia: '37.00', variante: 'M', retornavel: false }],
      signature,
    });
    expect(result.pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(result.pdfHash).toBe(createHash('sha256').update(result.pdf).digest('hex'));
    expect(result.signatureHash).toHaveLength(64);
    expect(result.pdf.toString('latin1')).toContain(Buffer.from('Declaro responsabilidade').toString('hex'));
  });

  it('rejeita assinatura vazia ou formato não PNG', async () => {
    const service = new TermoPdfService('/tmp/kaizen-termo-test');
    await expect(service.generate({ termoTexto: 'x', termoVersao: '1', colaboradorNome: 'A', aceitoEm: new Date(), itens: [], signature: '' })).rejects.toThrow('Assinatura PNG inválida');
  });
});
