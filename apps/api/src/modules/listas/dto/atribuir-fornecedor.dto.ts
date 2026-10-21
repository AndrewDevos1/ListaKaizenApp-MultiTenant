import { IsArray, IsInt, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AtribuirFornecedorDto {
  @ApiProperty({ example: [1, 2, 3], type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  @ArrayMinSize(1)
  itemRefIds: number[];

  @ApiProperty({ example: 1 })
  @IsInt()
  fornecedorId: number;
}
