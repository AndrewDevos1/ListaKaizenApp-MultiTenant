import { IsBoolean, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateItemRefDto {
  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  usaThreshold?: boolean;

  @ApiPropertyOptional({ example: 12.5 })
  @IsNumber()
  @IsOptional()
  qtdFardo?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  quantidadeMinima?: number;
}
