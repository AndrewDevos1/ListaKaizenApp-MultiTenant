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
