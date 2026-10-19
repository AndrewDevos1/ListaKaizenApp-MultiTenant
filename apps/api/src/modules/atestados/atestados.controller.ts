import { Body, Controller, ForbiddenException, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Modulo, Roles, TenantId } from '../../common/decorators';
import { ModuloGuard, RolesGuard, TenantGuard } from '../../common/guards';
import { AtestadosService } from './atestados.service';
import { CriarAtestadoDto } from './dto/criar-atestado.dto';
import { DecidirAtestadoDto } from './dto/decidir-atestado.dto';
import { ListarAtestadosDto } from './dto/listar-atestados.dto';

@ApiTags('Admin — Atestados')
@Controller('v1/admin/atestados')
@Modulo('moduloFuncionarios')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard, ModuloGuard)
@Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
@ApiBearerAuth()
export class AtestadosController {
  constructor(private readonly service: AtestadosService) {}
  @Get() listar(@TenantId() restauranteId: number | null, @Query() filters: ListarAtestadosDto) { return this.service.listar(this.requireTenant(restauranteId), filters); }
  @Post() criar(@TenantId() restauranteId: number | null, @CurrentUser('id') adminId: number, @Body() dto: CriarAtestadoDto) { return this.service.criar(this.requireTenant(restauranteId), adminId, dto); }
  @Put(':id/decidir') @ApiOperation({ summary: 'Aprovar ou rejeitar atestado; abono passa a compor o espelho' }) decidir(@TenantId() restauranteId: number | null, @CurrentUser('id') adminId: number, @Param('id', ParseIntPipe) id: number, @Body() dto: DecidirAtestadoDto) { return this.service.decidir(this.requireTenant(restauranteId), adminId, id, dto); }
  @Put(':id/cancelar') cancelar(@TenantId() restauranteId: number | null, @CurrentUser('id') adminId: number, @Param('id', ParseIntPipe) id: number) { return this.service.cancelar(this.requireTenant(restauranteId), adminId, id); }

  private requireTenant(restauranteId: number | null) {
    if (restauranteId == null) throw new ForbiddenException('Selecione um restaurante');
    return restauranteId;
  }
}
