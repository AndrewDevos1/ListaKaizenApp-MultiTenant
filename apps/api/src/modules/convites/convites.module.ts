import { Module } from '@nestjs/common';
import {
  AdminConvitesController,
  PublicConvitesController,
} from './convites.controller';
import { ConvitesService } from './convites.service';
import { RestaurantesModule } from '../restaurantes/restaurantes.module';

@Module({
  imports: [RestaurantesModule],
  controllers: [AdminConvitesController, PublicConvitesController],
  providers: [ConvitesService],
  exports: [ConvitesService],
})
export class ConvitesModule {}
