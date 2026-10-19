import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PontoModule } from '../ponto/ponto.module';
import { RestaurantesModule } from '../restaurantes/restaurantes.module';
import { ContadorController } from './contador.controller';
import { ContadorAdminController } from './contador.admin.controller';
import { ContadorService } from './contador.service';

@Module({ imports: [PrismaModule, PontoModule, RestaurantesModule], controllers: [ContadorController, ContadorAdminController], providers: [ContadorService] })
export class ContadorModule {}
