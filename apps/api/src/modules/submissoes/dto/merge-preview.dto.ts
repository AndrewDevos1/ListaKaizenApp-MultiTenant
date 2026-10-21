import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MergePreviewDto {
  @ApiProperty({ type: [Number], example: [1, 2, 3] })
  @IsArray()
  @IsInt({ each: true })
  submissaoIds: number[];

  @ApiPropertyOptional({ example: 'Pedido semanal — cozinha' })
  @IsString()
  @IsOptional()
  titulo?: string;
}
