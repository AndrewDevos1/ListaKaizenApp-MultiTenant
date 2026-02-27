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
  ],
})
export class AppModule {}
