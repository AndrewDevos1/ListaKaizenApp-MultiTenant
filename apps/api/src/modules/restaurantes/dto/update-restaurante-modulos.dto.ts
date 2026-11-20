import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRestauranteModulosDto {
  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  moduloPonto?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  moduloFuncionarios?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  moduloAlmoxarifadoEpi?: boolean;
}
