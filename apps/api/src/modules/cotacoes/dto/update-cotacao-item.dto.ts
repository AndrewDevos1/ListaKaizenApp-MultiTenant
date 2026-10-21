import { IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCotacaoItemDto {
  @ApiProperty({ example: 12.5 })
  @IsNumber()
  @IsPositive()
  precoUnitario: number;
}
