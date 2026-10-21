import { IsArray, IsInt, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ItemEstoqueDto {
  @IsInt()
  itemRefId: number;

  @IsNumber()
  quantidadeAtual: number;
}

export class AtualizarEstoqueAreaDto {
  @ApiProperty({ type: [ItemEstoqueDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemEstoqueDto)
  itens: ItemEstoqueDto[];
}
