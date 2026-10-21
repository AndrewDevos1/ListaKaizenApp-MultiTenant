import { Module } from '@nestjs/common';
import { CotacoesController } from './cotacoes.controller';
import { CotacoesService } from './cotacoes.service';

@Module({
  controllers: [CotacoesController],
  providers: [CotacoesService],
  exports: [CotacoesService],
})
export class CotacoesModule {}
