import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRestauranteDto {
  @ApiProperty({ example: 'Restaurante Kaizen' })
  @IsString()
  @IsNotEmpty()
  nome: string;

  @ApiProperty({ example: '12.345.678/0001-90', required: false })
  @IsString()
  @IsOptional()
  cnpj?: string;
}
