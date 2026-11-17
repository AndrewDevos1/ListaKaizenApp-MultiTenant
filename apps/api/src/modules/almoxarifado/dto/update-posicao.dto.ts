import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';
export class UpdatePosicaoDto { @IsOptional() @IsNumber() @Min(0) minimo?: number | null; @IsOptional() @IsString() localizacao?: string | null; @IsOptional() @IsString() observacao?: string | null; @IsOptional() @IsBoolean() ativo?: boolean; }
