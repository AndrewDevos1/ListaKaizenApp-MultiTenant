import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsString, MaxLength, Min } from 'class-validator';

export class CriarAtestadoDto {
  @Type(() => Number) @IsInt() @Min(1) usuarioId: number;
  @IsDateString() inicio: string;
  @IsDateString() fim: string;
  @IsString() @MaxLength(500) motivo: string;
}
