import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { RestaurantesModule } from './modules/restaurantes/restaurantes.module';
import { ItemsModule } from './modules/items/items.module';
import { AreasModule } from './modules/areas/areas.module';
import { ListasModule } from './modules/listas/listas.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    RestaurantesModule,
    ItemsModule,
    AreasModule,
    ListasModule,
  ],
})
export class AppModule {}
