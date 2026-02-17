import { IsInt, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddItemRefDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  itemId: number;

  @ApiProperty({ example: 10, required: false })
  @IsNumber()
  @IsOptional()
  quantidadeMinima?: number;
}
