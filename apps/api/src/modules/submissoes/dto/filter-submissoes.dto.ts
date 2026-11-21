import { IsEnum, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StatusSubmissao } from '@prisma/client';

export enum TipoFiltroSubmissoes {
  TRADICIONAIS = 'TRADICIONAIS',
  CONSOLIDADAS = 'CONSOLIDADAS',
}

export class FilterSubmissoesDto {
  @ApiPropertyOptional({
    enum: TipoFiltroSubmissoes,
    default: TipoFiltroSubmissoes.TRADICIONAIS,
  })
  @IsEnum(TipoFiltroSubmissoes)
  @IsOptional()
  tipo?: TipoFiltroSubmissoes;

  @ApiPropertyOptional({ enum: StatusSubmissao })
  @IsEnum(StatusSubmissao)
  @IsOptional()
  status?: StatusSubmissao;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  arquivada?: boolean;

  // Seletor de tenant de SUPER_ADMIN; @TenantId ignora para ADMIN/COLLABORATOR
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  restauranteId?: number;
}
