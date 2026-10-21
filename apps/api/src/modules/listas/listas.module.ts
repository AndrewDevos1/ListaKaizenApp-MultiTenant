import { Module } from '@nestjs/common';
import {
  ListasController,
  CollaboratorListasController,
  AdminGruposListasController,
} from './listas.controller';
import { ListasService } from './listas.service';
import { RestaurantesModule } from '../restaurantes/restaurantes.module';

@Module({
  imports: [RestaurantesModule],
  controllers: [
    ListasController,
    CollaboratorListasController,
    AdminGruposListasController,
  ],
  providers: [ListasService],
  exports: [ListasService],
})
export class ListasModule {}
