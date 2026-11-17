import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsNumber, Min, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EditarSubmissaoItemDto {
  @ApiProperty({ example: 10, description: 'ID do Item (não do ListaItemRef)' })
  @IsInt()
  itemId: number;

  @ApiProperty({ example: 4.5 })
  @IsNumber()
  @Min(0)
  quantidadeAtual: number;
}

export class EditarSubmissaoDto {
  @ApiProperty({ type: [EditarSubmissaoItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EditarSubmissaoItemDto)
  itens: EditarSubmissaoItemDto[];
}
