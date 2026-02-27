import { Module } from '@nestjs/common';
import { AdminPOPController, CollaboratorPOPController } from './pop.controller';
import { POPService } from './pop.service';

@Module({
  controllers: [AdminPOPController, CollaboratorPOPController],
  providers: [POPService],
  exports: [POPService],
})
export class POPModule {}
