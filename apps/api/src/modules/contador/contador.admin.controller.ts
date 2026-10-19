import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles, TenantId } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';
import { ConfigurarVinculoDto } from './dto/configurar-vinculo.dto';
import { ContadorService } from './contador.service';

@ApiTags('Admin — Contador')
@Controller('v1/admin/contador')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
@Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
@ApiBearerAuth()
export class ContadorAdminController {
  constructor(private readonly service: ContadorService) {}

  @Post('vinculos')
  configurar(
    @CurrentUser('id') adminId: number,
    @TenantId() restauranteId: number,
    @Body() dto: ConfigurarVinculoDto,
  ) {
    return this.service.configurarVinculo(adminId, restauranteId, dto.contadorId, dto.funcionarioId, dto.permissoes);
  }
}
