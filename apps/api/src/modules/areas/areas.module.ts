import { Module } from '@nestjs/common';
import { AreasController, CollaboratorAreasController } from './areas.controller';
import { AreasService } from './areas.service';
import { RestaurantesModule } from '../restaurantes/restaurantes.module';

@Module({
  imports: [RestaurantesModule],
  controllers: [AreasController, CollaboratorAreasController],
  providers: [AreasService],
  exports: [AreasService],
})
export class AreasModule {}
