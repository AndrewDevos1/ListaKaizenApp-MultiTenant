import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateCatalogoItemDto {
  @IsString() @IsNotEmpty() @MaxLength(200) @Transform(trim) nome: string;
  @IsString() @IsNotEmpty() @MaxLength(20) @Transform(trim) unidadeMedida: string;
  @IsOptional() @IsString() @MaxLength(60) @Transform(trim) codigoFornecedor?: string;
  @IsOptional() @IsString() @MaxLength(120) @Transform(trim) marca?: string;
  @IsOptional() @IsString() @MaxLength(1000) descricao?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9999999999) precoAtual?: number;
  @IsOptional() @IsBoolean() ativo?: boolean;
}

export class UpdateCatalogoItemDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) @Transform(trim) nome?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(20) @Transform(trim) unidadeMedida?: string;
  @IsOptional() @IsString() @MaxLength(60) @Transform(trim) codigoFornecedor?: string;
  @IsOptional() @IsString() @MaxLength(120) @Transform(trim) marca?: string;
  @IsOptional() @IsString() @MaxLength(1000) descricao?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(9999999999) precoAtual?: number;
  @IsOptional() @IsBoolean() ativo?: boolean;
}

export class ListarCatalogoQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) q?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value)) @IsBoolean() ativo?: boolean;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @Min(1) @Max(100000) restauranteId?: number;
}

export class PreviewCatalogoDto {
  @IsIn(['csv', 'texto']) formato: 'csv' | 'texto';
  @IsString() @IsNotEmpty() @MaxLength(2_000_000) conteudo: string;
}

export class ConfirmarCatalogoDto {
  @IsUUID() token: string;
}
