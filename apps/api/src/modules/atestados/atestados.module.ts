import { Module } from '@nestjs/common';
import { RestaurantesModule } from '../restaurantes/restaurantes.module';
import { AtestadosController } from './atestados.controller';
import { AtestadosService } from './atestados.service';

@Module({
  imports: [RestaurantesModule],
  controllers: [AtestadosController],
  providers: [AtestadosService],
})
export class AtestadosModule {}
