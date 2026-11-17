import { IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { TipoClassificacaoAusencia } from '@prisma/client';

export class ClassificarAusenciaDto {
  @IsInt()
  usuarioId: number;

  @IsDateString()
  data: string;

  @IsEnum(TipoClassificacaoAusencia)
  tipo: TipoClassificacaoAusencia;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}
