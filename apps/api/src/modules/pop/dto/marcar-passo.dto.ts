import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class MarcarPassoDto {
  @IsBoolean()
  marcado: boolean;

  @IsOptional()
  @IsString()
  observacao?: string;
}
