import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePosicaoDto {
  @IsInt() @Min(1) materialId: number;
  @IsOptional() @IsInt() @Min(1) varianteId?: number;
  @IsOptional() @IsNumber() @Min(0) minimo?: number;
  @IsOptional() @IsString() localizacao?: string;
  @IsOptional() @IsString() observacao?: string;
}
