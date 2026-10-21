import { IsString } from 'class-validator';

export class CreateSugestaoDto {
  @IsString()
  nome: string;

  @IsString()
  unidadeMedida: string;
}
