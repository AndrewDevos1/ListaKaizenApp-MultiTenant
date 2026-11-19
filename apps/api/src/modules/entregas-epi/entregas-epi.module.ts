import { Module } from '@nestjs/common';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { RestaurantesModule } from '../restaurantes/restaurantes.module';
import { SuperAdminTenantGuard } from '../almoxarifado/super-admin-tenant.guard';
import { EntregasEpiController } from './entregas-epi.controller';
import { EntregasEpiService } from './entregas-epi.service';

@Module({ imports: [NotificacoesModule, RestaurantesModule], controllers: [EntregasEpiController], providers: [EntregasEpiService, SuperAdminTenantGuard] })
export class EntregasEpiModule {}
