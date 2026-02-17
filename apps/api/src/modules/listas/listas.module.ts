import { Module } from '@nestjs/common';
import { ListasController, CollaboratorListasController } from './listas.controller';
import { ListasService } from './listas.service';

@Module({
  controllers: [ListasController, CollaboratorListasController],
  providers: [ListasService],
  exports: [ListasService],
})
export class ListasModule {}
