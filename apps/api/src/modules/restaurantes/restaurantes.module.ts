import { Module } from '@nestjs/common';
import { RestaurantesController } from './restaurantes.controller';
import { RestaurantesService } from './restaurantes.service';
import { RestauranteModulosService } from './restaurante-modulos.service';

@Module({
  controllers: [RestaurantesController],
  providers: [RestaurantesService, RestauranteModulosService],
  exports: [RestauranteModulosService],
})
export class RestaurantesModule {}
