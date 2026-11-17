import { Module } from '@nestjs/common';
import { RestaurantesModule } from '../restaurantes/restaurantes.module';
import { AusenciasController } from './ausencias.controller';
import { AusenciasService } from './ausencias.service';

@Module({
  imports: [RestaurantesModule],
  controllers: [AusenciasController],
  providers: [AusenciasService],
})
export class AusenciasModule {}
