import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { TipoMovimentacaoAlmoxarifado } from '@prisma/client';

export class MovimentarDto {
  @IsIn([TipoMovimentacaoAlmoxarifado.ENTRADA, TipoMovimentacaoAlmoxarifado.AJUSTE])
  tipo: TipoMovimentacaoAlmoxarifado;
  @Type(() => Number) @IsNumber() @Min(0.001) quantidade: number;
  @IsString() @IsNotEmpty() motivo: string;
  @IsString() @IsNotEmpty() chaveIdempotencia: string;
}
