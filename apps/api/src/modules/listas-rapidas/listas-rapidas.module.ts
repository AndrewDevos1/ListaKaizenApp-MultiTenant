import { Module } from '@nestjs/common';
import {
  AdminListasRapidasController,
  CollaboratorListasRapidasController,
} from './listas-rapidas.controller';
import { ListasRapidasService } from './listas-rapidas.service';

@Module({
  controllers: [
    CollaboratorListasRapidasController,
    AdminListasRapidasController,
  ],
  providers: [ListasRapidasService],
  exports: [ListasRapidasService],
})
export class ListasRapidasModule {}
