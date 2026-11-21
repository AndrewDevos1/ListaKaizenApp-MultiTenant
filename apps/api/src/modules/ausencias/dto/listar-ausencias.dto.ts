import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { TipoClassificacaoAusencia } from '@prisma/client';

export class ListarAusenciasDto {
  // Seletor de restaurante (SUPER_ADMIN); resolvido por @TenantId, não é filtro.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  restauranteId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  usuarioId?: number;

  @IsOptional()
  @IsEnum(TipoClassificacaoAusencia)
  tipo?: TipoClassificacaoAusencia;
}
