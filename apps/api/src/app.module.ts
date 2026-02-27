import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { RestaurantesModule } from './modules/restaurantes/restaurantes.module';
import { ItemsModule } from './modules/items/items.module';
import { AreasModule } from './modules/areas/areas.module';
import { ListasModule } from './modules/listas/listas.module';
import { SubmissoesModule } from './modules/submissoes/submissoes.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { FornecedoresModule } from './modules/fornecedores/fornecedores.module';
import { CotacoesModule } from './modules/cotacoes/cotacoes.module';
import { ChecklistsModule } from './modules/checklists/checklists.module';
import { ListasRapidasModule } from './modules/listas-rapidas/listas-rapidas.module';
import { SugestoesModule } from './modules/sugestoes/sugestoes.module';
import { POPModule } from './modules/pop/pop.module';
import { NotificacoesModule } from './modules/notificacoes/notificacoes.module';
import { ConvitesModule } from './modules/convites/convites.module';
import { LogsModule } from './modules/logs/logs.module';
import { PushModule } from './modules/push/push.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    RestaurantesModule,
    ItemsModule,
    AreasModule,
    ListasModule,
    SubmissoesModule,
    UsuariosModule,
    FornecedoresModule,
    CotacoesModule,
    ChecklistsModule,
    ListasRapidasModule,
    SugestoesModule,
    POPModule,
    NotificacoesModule,
    ConvitesModule,
    LogsModule,
    PushModule,
  ],
})
export class AppModule {}
