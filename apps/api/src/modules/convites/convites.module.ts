import { Module } from '@nestjs/common';
import {
  AdminConvitesController,
  PublicConvitesController,
} from './convites.controller';
import { ConvitesService } from './convites.service';

@Module({
  controllers: [AdminConvitesController, PublicConvitesController],
  providers: [ConvitesService],
  exports: [ConvitesService],
})
export class ConvitesModule {}
