import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PontoModule } from '../ponto/ponto.module';
import { ContadorController } from './contador.controller';
import { ContadorAdminController } from './contador.admin.controller';
import { ContadorService } from './contador.service';

@Module({ imports: [PrismaModule, PontoModule], controllers: [ContadorController, ContadorAdminController], providers: [ContadorService] })
export class ContadorModule {}
