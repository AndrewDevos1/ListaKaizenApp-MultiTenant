import { Controller, ForbiddenException, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Modulo, Roles, TenantId } from '../../common/decorators';
import { ModuloGuard, RolesGuard, TenantGuard } from '../../common/guards';
import { EspelhoService } from './espelho.service';

@ApiTags('Colaborador — Espelho de ponto')
@Controller('v1/collaborator/espelho-ponto')
@Modulo('moduloPonto')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard, ModuloGuard)
@Roles('COLLABORATOR' as any, 'ADMIN' as any)
@ApiBearerAuth()
export class EspelhoController {
  constructor(private readonly service: EspelhoService) {}

  @Get()
  @ApiOperation({ summary: 'Consultar espelho mensal sem mutar registros' })
  consultar(@TenantId() restauranteId: number | null, @CurrentUser('id') usuarioId: number, @Query('competencia') competencia: string) {
    if (!restauranteId) throw new ForbiddenException('Usuário não está vinculado a nenhum restaurante');
    return this.service.consultar(restauranteId, usuarioId, competencia);
  }
}
