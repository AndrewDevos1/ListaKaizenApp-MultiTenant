import { IsArray, IsEnum, IsInt, IsNotEmpty } from 'class-validator';
import { ContadorPermissao } from '@prisma/client';

export class ConfigurarVinculoDto {
  @IsInt()
  @IsNotEmpty()
  contadorId!: number;

  @IsInt()
  @IsNotEmpty()
  funcionarioId!: number;

  @IsArray()
  @IsEnum(ContadorPermissao, { each: true })
  permissoes!: ContadorPermissao[];
}
