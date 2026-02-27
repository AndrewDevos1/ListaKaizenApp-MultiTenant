import { Module } from '@nestjs/common';
import {
  AdminSugestoesController,
  CollaboratorSugestoesController,
} from './sugestoes.controller';
import { SugestoesService } from './sugestoes.service';

@Module({
  controllers: [CollaboratorSugestoesController, AdminSugestoesController],
  providers: [SugestoesService],
  exports: [SugestoesService],
})
export class SugestoesModule {}
