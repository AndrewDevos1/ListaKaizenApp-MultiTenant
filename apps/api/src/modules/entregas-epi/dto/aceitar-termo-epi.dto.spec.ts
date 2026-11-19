import { validate } from 'class-validator';
import { AceitarTermoEpiDto } from './aceitar-termo-epi.dto';

describe('AceitarTermoEpiDto', () => {
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  it('aceita somente PNG base64, limite real e campos estritos', async () => {
    await expect(validate(Object.assign(new AceitarTermoEpiDto(), { termoId: 1, assinatura: png, hashTermo: 'a'.repeat(64), lido: true }))).resolves.toHaveLength(0);
    await expect(validate(Object.assign(new AceitarTermoEpiDto(), { termoId: 1, assinatura: 'data:image/jpeg;base64,/9j/', hashTermo: 'a'.repeat(64), lido: true }))).resolves.not.toHaveLength(0);
  });
});
