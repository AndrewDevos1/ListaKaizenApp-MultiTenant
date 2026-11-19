import { Type } from 'class-transformer';
import { CategoriaMaterialAlmoxarifado } from '@prisma/client';
import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateMaterialDto {
  @IsString() @IsNotEmpty() nome: string;
  @IsEnum(CategoriaMaterialAlmoxarifado) categoria: CategoriaMaterialAlmoxarifado;
  @IsBoolean() retornavel: boolean;
  @Type(() => Number) @IsNumber() @Min(0) valorReferencia: number;
  @IsOptional() @IsBoolean() ativo?: boolean;
}
