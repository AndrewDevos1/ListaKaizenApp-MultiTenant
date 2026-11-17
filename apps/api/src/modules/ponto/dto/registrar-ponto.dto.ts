import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TipoPonto } from '@prisma/client';

export class RegistrarPontoDto {
  @IsOptional()
  @IsEnum(TipoPonto)
  tipo?: TipoPonto;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacoes?: string;
}
