import { Module } from '@nestjs/common';
import {
  AdminSubmissoesController,
  CollaboratorSubmissoesController,
} from './submissoes.controller';
import { SubmissoesService } from './submissoes.service';

@Module({
  controllers: [AdminSubmissoesController, CollaboratorSubmissoesController],
  providers: [SubmissoesService],
  exports: [SubmissoesService],
})
export class SubmissoesModule {}
