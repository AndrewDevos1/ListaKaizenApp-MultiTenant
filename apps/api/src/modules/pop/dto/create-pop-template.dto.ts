import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { TipoPOP } from '@prisma/client';

export class CreatePOPPassoDto {
  @IsString()
  descricao: string;

  @IsInt()
  @Min(1)
  ordem: number;
}

export class CreatePOPTemplateDto {
  @IsString()
  nome: string;

  @IsEnum(TipoPOP)
  tipo: TipoPOP;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePOPPassoDto)
  passos: CreatePOPPassoDto[];
}
