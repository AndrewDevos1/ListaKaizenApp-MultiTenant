import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class CriarAtestadoDto {
  @Type(() => Number) @IsInt() @Min(1) usuarioId: number;
  @IsDateString() inicio: string;
  @IsDateString() fim: string;
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) horaInicio?: string;
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) horaFim?: string;
  @IsString() @MaxLength(500) motivo: string;
}
