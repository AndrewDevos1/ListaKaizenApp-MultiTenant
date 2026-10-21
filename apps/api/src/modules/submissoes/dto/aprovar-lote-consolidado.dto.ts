import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class AprovarLoteConsolidadoDto {
  @ApiPropertyOptional({
    description: 'Permite aprovar mesmo com sublistas faltantes',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  confirmarParcial?: boolean;
}
