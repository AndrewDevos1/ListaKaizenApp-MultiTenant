import { IsArray, IsInt, IsOptional, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CopyMoveItemsDto {
  @ApiProperty({ example: [1, 2, 3], type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  @ArrayMinSize(1)
  itemRefIds: number[];

  @ApiPropertyOptional({ example: 5, description: 'ID de lista de destino existente' })
  @IsInt()
  @IsOptional()
  listaDestinoId?: number;

  @ApiPropertyOptional({ example: 'Nova Lista Criada', description: 'Nome para criar uma nova lista de destino' })
  @IsString()
  @IsOptional()
  nomeNovaLista?: string;

  @ApiPropertyOptional({ example: 2, description: 'ID de área para a nova lista' })
  @IsInt()
  @IsOptional()
  areaId?: number;
}
