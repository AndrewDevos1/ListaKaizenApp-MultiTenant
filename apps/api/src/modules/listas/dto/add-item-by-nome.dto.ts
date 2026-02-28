import { IsString, IsNumber, IsOptional, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddItemByNomeDto {
  @ApiProperty({ example: 'Farinha de Trigo' })
  @IsString()
  @IsNotEmpty()
  nome: string;

  @ApiProperty({ example: 'kg' })
  @IsString()
  @IsNotEmpty()
  unidadeMedida: string;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  quantidadeAtual?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  quantidadeMinima?: number;
}
