import { validate } from 'class-validator';
import { AceitarTermoEpiDto } from './aceitar-termo-epi.dto';

describe('AceitarTermoEpiDto', () => {
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  it('aceita somente PNG base64, limite real e campos estritos', async () => {
    await expect(validate(Object.assign(new AceitarTermoEpiDto(), { termoId: 1, assinatura: png, hashTermo: 'a'.repeat(64), lido: true }))).resolves.toHaveLength(0);
    await expect(validate(Object.assign(new AceitarTermoEpiDto(), { termoId: 1, assinatura: 'data:image/png;base64,not-base64!', hashTermo: 'a'.repeat(64), lido: true }))).resolves.not.toHaveLength(0);
    const oversized = `data:image/png;base64,${Buffer.concat([Buffer.from('\x89PNG\r\n\x1a\n', 'binary'), Buffer.alloc(64 * 1024)]).toString('base64')}`;
    await expect(validate(Object.assign(new AceitarTermoEpiDto(), { termoId: 1, assinatura: oversized, hashTermo: 'a'.repeat(64), lido: true }))).resolves.not.toHaveLength(0);
  });
});
