import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDateString, IsInt, IsOptional, IsString, Matches, MaxLength, Min, ValidateNested } from 'class-validator';

class DiaEscalaDto {
  @IsInt() @Min(0) diaSemana: number;
  @IsBoolean() trabalha: boolean;
  @IsOptional() @Matches(/^\d{2}:\d{2}$/) entradaPrevista?: string;
  @IsOptional() @Matches(/^\d{2}:\d{2}$/) saidaPrevista?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) toleranciaMinutos?: number;
}

export class CriarEscalaDto {
  @Type(() => Number) @IsInt() @Min(1) usuarioId: number;
  @IsString() @MaxLength(120) nome: string;
  @IsDateString() vigenciaInicio: string;
  @IsOptional() @IsDateString() vigenciaFim?: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(7) @ValidateNested({ each: true }) @Type(() => DiaEscalaDto) dias: DiaEscalaDto[];
}
