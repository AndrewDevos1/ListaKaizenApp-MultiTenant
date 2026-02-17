import { Module } from '@nestjs/common';
import { RestaurantesController } from './restaurantes.controller';
import { RestaurantesService } from './restaurantes.service';

@Module({
  controllers: [RestaurantesController],
  providers: [RestaurantesService],
  exports: [RestaurantesService],
})
export class RestaurantesModule {}
