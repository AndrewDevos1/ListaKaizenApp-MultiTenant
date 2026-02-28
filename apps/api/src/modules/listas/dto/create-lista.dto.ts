import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateListaDto {
  @ApiProperty({ example: 'Lista Semanal' })
  @IsString()
  @IsNotEmpty()
  nome: string;

  @ApiPropertyOptional({ example: 'Lista de itens para reposição semanal' })
  @IsOptional()
  @IsString()
  descricao?: string;
}
