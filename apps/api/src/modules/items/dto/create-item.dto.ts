import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateItemDto {
  @ApiProperty({ example: 'Arroz 5kg' })
  @IsString()
  @IsNotEmpty()
  nome: string;

  @ApiProperty({ example: 'kg' })
  @IsString()
  @IsNotEmpty()
  unidadeMedida: string;
}
