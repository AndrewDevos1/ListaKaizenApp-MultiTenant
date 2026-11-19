import { Module } from '@nestjs/common';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { EntregasEpiController } from './entregas-epi.controller';
import { EntregasEpiService } from './entregas-epi.service';

@Module({ imports: [NotificacoesModule], controllers: [EntregasEpiController], providers: [EntregasEpiService] })
export class EntregasEpiModule {}
