import { PartialType } from '@nestjs/swagger';
import { CreateRestauranteDto } from './create-restaurante.dto';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateRestauranteDto extends PartialType(CreateRestauranteDto) {
  @IsBoolean()
  @IsOptional()
  ativo?: boolean;

  @IsInt()
  @Min(5)
  @Max(480)
  @IsOptional()
  sessionTimeoutMinutos?: number;
}
