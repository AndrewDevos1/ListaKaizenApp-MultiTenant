import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddItemRefDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  itemId: number;

  @ApiProperty({ example: 10, required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  quantidadeMinima?: number;
}
