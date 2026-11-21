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
import { NotificacoesModule } from './modules/notificacoes/notificacoes.module';
import { ConvitesModule } from './modules/convites/convites.module';
import { LogsModule } from './modules/logs/logs.module';
import { PushModule } from './modules/push/push.module';
import { ImportModule } from './modules/import/import.module';
import { PontoModule } from './modules/ponto/ponto.module';
import { AusenciasModule } from './modules/ausencias/ausencias.module';
import { AtestadosModule } from './modules/atestados/atestados.module';

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
    NotificacoesModule,
    ConvitesModule,
    LogsModule,
    PushModule,
    ImportModule,
    PontoModule,
    AusenciasModule,
    AtestadosModule,
  ],
})
export class AppModule {}
