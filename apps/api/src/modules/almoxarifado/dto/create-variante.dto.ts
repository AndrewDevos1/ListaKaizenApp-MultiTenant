import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateVarianteDto {
  @IsInt() @Min(1) materialId: number;
  @IsOptional() @IsString() tamanho?: string;
  @IsOptional() @IsString() descricao?: string;
}
