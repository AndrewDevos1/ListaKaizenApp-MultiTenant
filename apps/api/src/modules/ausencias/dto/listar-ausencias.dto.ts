import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { TipoClassificacaoAusencia } from '@prisma/client';

export class ListarAusenciasDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  usuarioId?: number;

  @IsOptional()
  @IsEnum(TipoClassificacaoAusencia)
  tipo?: TipoClassificacaoAusencia;
}
