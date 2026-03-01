import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateListaRapidaItemDto {
  @IsString()
  nome: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantidade?: number;

  @IsOptional()
  @IsString()
  unidade?: string;

  @IsOptional()
  @IsInt()
  itemId?: number;

  @IsOptional()
  @IsString()
  prioridade?: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}

export class CreateListaRapidaDto {
  @IsString()
  nome: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateListaRapidaItemDto)
  itens?: CreateListaRapidaItemDto[];
}
