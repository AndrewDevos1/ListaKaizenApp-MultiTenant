import { IsBoolean, IsInt, IsNotEmpty, Matches, Min, Validate, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

// ponteiro: limite de 64 KiB cabe no limite JSON padrão do Express (100 KB, base64 ~87 KB); acima disso retornaria 413.
const MAX_SIGNATURE_BYTES = 64 * 1024;
const PNG_MAGIC = Buffer.from('\x89PNG\r\n\x1a\n', 'binary');

@ValidatorConstraint({ name: 'pngDataUrl', async: false })
class PngDataUrlConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    if (typeof value !== 'string') return false;
    const match = /^data:image\/png;base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    if (!match) return false;
    const bytes = Buffer.from(match[1], 'base64');
    return bytes.length > 8 && bytes.length <= MAX_SIGNATURE_BYTES && bytes.subarray(0, 8).equals(PNG_MAGIC);
  }
  defaultMessage() { return 'assinatura deve ser PNG base64 válido de até 64 KiB'; }
}

export class AceitarTermoEpiDto {
  @IsInt() @Min(1) termoId: number;
  @IsNotEmpty() @Validate(PngDataUrlConstraint) assinatura: string;
  @Matches(/^[a-f0-9]{64}$/i, { message: 'hashTermo deve ser SHA-256 hexadecimal' }) hashTermo: string;
  @IsBoolean() lido: boolean;
}
