import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFornecedorDto {
  @ApiProperty({ example: 'Distribuidora Silva' })
  @IsString()
  @IsNotEmpty()
  nome: string;

  @ApiPropertyOptional({ example: '12.345.678/0001-90' })
  @IsString()
  @IsOptional()
  cnpj?: string;

  @ApiPropertyOptional({ example: '(11) 98765-4321' })
  @IsString()
  @IsOptional()
  telefone?: string;

  @ApiPropertyOptional({ example: 'contato@distribuidorasilva.com.br' })
  @IsEmail()
  @IsOptional()
  email?: string;
}
