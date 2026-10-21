import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateItemDto {
  @ApiProperty({ example: 'Arroz 5kg' })
  @IsString()
  @IsNotEmpty()
  nome: string;

  @ApiProperty({ example: 'kg' })
  @IsString()
  @IsNotEmpty()
  unidadeMedida: string;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  fornecedorId?: number;
}
