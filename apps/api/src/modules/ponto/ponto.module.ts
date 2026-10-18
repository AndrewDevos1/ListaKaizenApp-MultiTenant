import { Module } from '@nestjs/common';
import { RestaurantesModule } from '../restaurantes/restaurantes.module';
import { PontoController } from './ponto.controller';
import { PontoService } from './ponto.service';

@Module({
  imports: [RestaurantesModule],
  controllers: [PontoController],
  providers: [PontoService],
})
export class PontoModule {}
