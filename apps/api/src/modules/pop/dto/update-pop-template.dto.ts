import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TipoPOP } from '@prisma/client';

export class UpdatePOPTemplateDto {
  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsEnum(TipoPOP)
  tipo?: TipoPOP;

  @IsOptional()
  @IsString()
  descricao?: string;
}
