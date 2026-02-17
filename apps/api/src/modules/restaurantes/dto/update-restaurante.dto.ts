import { PartialType } from '@nestjs/swagger';
import { CreateRestauranteDto } from './create-restaurante.dto';

export class UpdateRestauranteDto extends PartialType(CreateRestauranteDto) {}
