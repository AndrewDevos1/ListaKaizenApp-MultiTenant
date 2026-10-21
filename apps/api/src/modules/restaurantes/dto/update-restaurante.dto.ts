import { PartialType } from '@nestjs/swagger';
import { CreateRestauranteDto } from './create-restaurante.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateRestauranteDto extends PartialType(CreateRestauranteDto) {
  @IsBoolean()
  @IsOptional()
  ativo?: boolean;
}
