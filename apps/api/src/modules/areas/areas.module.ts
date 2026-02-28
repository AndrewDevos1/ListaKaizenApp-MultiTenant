import { Module } from '@nestjs/common';
import { AreasController, CollaboratorAreasController } from './areas.controller';
import { AreasService } from './areas.service';

@Module({
  controllers: [AreasController, CollaboratorAreasController],
  providers: [AreasService],
  exports: [AreasService],
})
export class AreasModule {}
