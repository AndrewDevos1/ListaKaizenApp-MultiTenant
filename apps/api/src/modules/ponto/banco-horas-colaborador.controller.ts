import { Controller, ForbiddenException, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Modulo, Roles, TenantId } from '../../common/decorators';
import { ModuloGuard, RolesGuard, TenantGuard } from '../../common/guards';
import { BancoHorasService } from './banco-horas.service';

@ApiTags('Colaborador — Banco de horas')
@Controller('v1/collaborator/banco-horas')
@Modulo('moduloPonto')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard, ModuloGuard)
@Roles('COLLABORATOR' as any, 'ADMIN' as any)
@ApiBearerAuth()
export class BancoHorasColaboradorController {
  constructor(private readonly service: BancoHorasService) {}

  @Get()
  @ApiOperation({ summary: 'Lançamentos do próprio banco de horas (somente leitura)' })
  consultar(@TenantId() restauranteId: number | null, @CurrentUser('id') usuarioId: number, @Query('competencia') competencia: string) {
    if (!restauranteId) throw new ForbiddenException('Usuário não está vinculado a nenhum restaurante');
    return this.service.listarProprios(restauranteId, usuarioId, competencia);
  }
}
