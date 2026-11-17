import { Global, Module } from '@nestjs/common';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService, TenantGuard],
  exports: [PrismaService, TenantGuard],
})
export class PrismaModule {}
