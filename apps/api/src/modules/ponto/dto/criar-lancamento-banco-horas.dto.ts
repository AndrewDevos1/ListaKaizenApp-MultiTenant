import { TipoLancamentoBancoHoras } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CriarLancamentoBancoHorasDto {
  @Type(() => Number) @IsInt() @Min(1) usuarioId: number;
  @IsEnum(TipoLancamentoBancoHoras) tipo: TipoLancamentoBancoHoras;
  @Type(() => Number) @IsInt() minutosDelta: number;
  @IsDateString() dataReferencia: string;
  @IsOptional() @IsDateString() periodoInicio?: string;
  @IsOptional() @IsDateString() periodoFim?: string;
  @IsString() @MaxLength(255) motivo: string;
}
