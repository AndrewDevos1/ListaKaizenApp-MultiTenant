import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export enum CondicaoDevolucaoInput {
  REUTILIZAVEL = 'REUTILIZAVEL',
  DANIFICADO = 'DANIFICADO',
  INUTILIZADO = 'INUTILIZADO',
  OUTRA = 'OUTRA',
}

export class DevolverEpiDto {
  @IsNumber() @Min(0.001) quantidade: number;
  @IsEnum(CondicaoDevolucaoInput) condicao: CondicaoDevolucaoInput;
  @IsString() @IsNotEmpty() chaveIdempotencia: string;
  @IsOptional() @IsString() observacao?: string;
}

export enum TipoOcorrenciaInput {
  PERDA = 'PERDA',
  DANO = 'DANO',
}

export class RegistrarOcorrenciaEpiDto {
  @IsNumber() @Min(0.001) quantidade: number;
  @IsEnum(TipoOcorrenciaInput) tipo: TipoOcorrenciaInput;
  @IsString() @IsNotEmpty() descricao: string;
  @IsString() @IsNotEmpty() chaveIdempotencia: string;
}

export class BaixaAdministrativaEpiDto {
  @IsNumber() @Min(0.001) quantidade: number;
  @IsString() @IsNotEmpty() descricao: string;
  @IsString() @IsNotEmpty() chaveIdempotencia: string;
}
