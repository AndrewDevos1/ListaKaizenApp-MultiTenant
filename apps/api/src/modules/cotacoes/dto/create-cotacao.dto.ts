import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCotacaoDto {
  @ApiPropertyOptional({ example: 'Cotação semanal — hortifruti' })
  @IsString()
  @IsOptional()
  titulo?: string;

  @ApiPropertyOptional({ type: [Number], example: [1, 2] })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  submissaoIds?: number[];
}
