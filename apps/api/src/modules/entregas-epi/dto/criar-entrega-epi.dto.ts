import { Type } from 'class-transformer';
import { ArrayUnique, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class EntregaEpiItemDto {
  @IsInt() @Min(1) posicaoId: number;
  @IsNumber() @Min(0.001) quantidade: number;
}

export class CriarEntregaEpiDto {
  @IsInt() @Min(1) funcionarioId: number;
  @IsString() @IsNotEmpty() chaveIdempotencia: string;
  @IsOptional() @IsString() observacoes?: string;
  @ArrayUnique((item: EntregaEpiItemDto) => item.posicaoId, { message: 'posicaoId não pode repetir' }) @ValidateNested({ each: true }) @Type(() => EntregaEpiItemDto) itens: EntregaEpiItemDto[];
}

export class RecusarEntregaEpiDto {
  @IsString() @IsNotEmpty() justificativa: string;
  @IsString() @IsNotEmpty() chaveIdempotencia: string;
}
