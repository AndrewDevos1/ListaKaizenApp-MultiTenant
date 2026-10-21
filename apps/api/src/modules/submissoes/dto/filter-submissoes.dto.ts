import { IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
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
}
