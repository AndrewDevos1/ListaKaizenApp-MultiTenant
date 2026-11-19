import { createHash } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import PDFDocument = require('pdfkit');

export type TermoItem = { nome: string; categoria: string; quantidade: string; valorReferencia: string; condicao?: string; variante?: string | null; retornavel: boolean };
export type TermoInput = { termoTexto: string; termoVersao: string; colaboradorNome: string; aceitoEm: Date; itens: TermoItem[]; signature: string };

export class TermoPdfService {
  constructor(private readonly storageRoot = process.env.PRIVATE_DOCUMENT_STORAGE ?? join(process.cwd(), 'private-storage')) {}

  private sha(value: Buffer | string) { return createHash('sha256').update(value).digest('hex'); }

  private signatureBytes(value: string) {
    const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(value.trim());
    if (!match) throw new Error('Assinatura PNG inválida');
    const bytes = Buffer.from(match[1], 'base64');
    if (bytes.length < 8 || bytes.subarray(0, 8).compare(Buffer.from('\x89PNG\r\n\x1a\n', 'binary')) !== 0) throw new Error('Assinatura PNG inválida');
    return bytes;
  }

  private pdf(input: TermoInput, signature: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 48, compress: false, info: { Title: `Termo EPI ${input.termoVersao}`, Author: 'Lista Kaizen' } });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.fontSize(16).text('TERMO DE RESPONSABILIDADE', { align: 'center' }).moveDown();
      doc.fontSize(10).text(`Colaborador: ${input.colaboradorNome}`);
      doc.text(`Versão do termo: ${input.termoVersao}`);
      doc.text(`Aceite registrado em: ${input.aceitoEm.toISOString()}`).moveDown();
      doc.fontSize(11).text(input.termoTexto, { align: 'justify' }).moveDown();
      doc.fontSize(12).text('Materiais registrados', { underline: true }).moveDown(0.4);
      for (const item of input.itens) doc.fontSize(10).text(`${item.nome} | ${item.categoria} | qtd. ${item.quantidade} | referência R$ ${item.valorReferencia} | condição: ${item.condicao ?? '-'} | variante: ${item.variante ?? '-'} | ${item.retornavel ? 'retornável' : 'não retornável'}`);
      doc.moveDown().text('Assinatura eletrônica desenhada:');
      doc.image(signature, 48, doc.y, { fit: [220, 100] });
      doc.moveDown().fontSize(8).text('Documento gerado a partir do termo e do snapshot imutáveis. Minuta sujeita a revisão jurídica e administrativa.');
      doc.end();
    });
  }

  async generate(input: TermoInput) {
    const signature = this.signatureBytes(input.signature);
    const snapshot = JSON.stringify({ termoTexto: input.termoTexto, termoVersao: input.termoVersao, colaboradorNome: input.colaboradorNome, aceitoEm: input.aceitoEm.toISOString(), itens: input.itens });
    const pdf = await this.pdf(input, signature);
    const documentHash = this.sha(snapshot + this.sha(signature));
    const pdfHash = this.sha(pdf);
    const signatureHash = this.sha(signature);
    const directory = join(this.storageRoot, 'termos');
    await mkdir(directory, { recursive: true });
    const storageKey = `termo-${documentHash}.pdf`;
    await writeFile(join(directory, storageKey), pdf, { flag: 'wx' }).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'EEXIST') throw error; });
    return { pdf, storageKey: `termos/${storageKey}`, snapshot, termHash: this.sha(input.termoTexto), snapshotHash: this.sha(snapshot), signatureHash, documentHash, pdfHash };
  }
}
