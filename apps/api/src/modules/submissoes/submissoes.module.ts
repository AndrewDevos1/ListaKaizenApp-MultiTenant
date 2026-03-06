import { Module } from '@nestjs/common';
import {
  AdminSubmissoesController,
  CollaboratorSubmissoesController,
} from './submissoes.controller';
import { SubmissoesService } from './submissoes.service';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';

@Module({
  imports: [NotificacoesModule],
  controllers: [AdminSubmissoesController, CollaboratorSubmissoesController],
  providers: [SubmissoesService],
  exports: [SubmissoesService],
})
export class SubmissoesModule {}
