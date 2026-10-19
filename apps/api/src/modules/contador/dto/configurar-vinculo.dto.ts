import { IsArray, IsEnum, IsInt, IsNotEmpty, ArrayNotEmpty } from 'class-validator';
import { ContadorPermissao } from '@prisma/client';

export class ConfigurarVinculoDto {
  @IsInt()
  @IsNotEmpty()
  contadorId!: number;

  @IsInt()
  @IsNotEmpty()
  funcionarioId!: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(ContadorPermissao, { each: true })
  permissoes!: ContadorPermissao[];
}
