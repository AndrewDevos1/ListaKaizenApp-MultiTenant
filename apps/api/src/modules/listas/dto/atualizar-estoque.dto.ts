import { IsInt, IsNumber, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class AtualizarEstoqueItemDto {
  @ApiProperty({ example: 1, description: 'ID do ListaItemRef' })
  @IsInt()
  itemRefId: number;

  @ApiProperty({ example: 5.5 })
  @IsNumber()
  quantidadeAtual: number;
}

export class AtualizarEstoqueDto {
  @ApiProperty({ type: [AtualizarEstoqueItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AtualizarEstoqueItemDto)
  itens: AtualizarEstoqueItemDto[];
}
