import { Module } from '@nestjs/common';
import { RestaurantesModule } from '../restaurantes/restaurantes.module';
import { PontoController } from './ponto.controller';
import { PontoService } from './ponto.service';
import { EscalaController } from './escala.controller';
import { EscalaService } from './escala.service';
import { EspelhoService } from './espelho.service';
import { EspelhoController } from './espelho.controller';
import { BancoHorasController } from './banco-horas.controller';
import { BancoHorasService } from './banco-horas.service';

@Module({
  imports: [RestaurantesModule],
  controllers: [PontoController, EscalaController, EspelhoController, BancoHorasController],
  providers: [PontoService, EscalaService, EspelhoService, BancoHorasService],
  exports: [EspelhoService],
})
export class PontoModule {}
