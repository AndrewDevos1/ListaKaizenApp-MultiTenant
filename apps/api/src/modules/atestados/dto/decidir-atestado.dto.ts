import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class DecidirAtestadoDto {
  @IsIn(['APROVADO', 'REJEITADO']) situacao: 'APROVADO' | 'REJEITADO';
  @IsOptional() @IsString() @MaxLength(500) observacao?: string;
}
