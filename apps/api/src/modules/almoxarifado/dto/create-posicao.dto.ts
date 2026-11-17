import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
export class CreatePosicaoDto { @IsInt() itemId: number; @IsOptional() @IsNumber() @Min(0) minimo?: number; @IsOptional() @IsString() localizacao?: string; @IsOptional() @IsString() observacao?: string; }
