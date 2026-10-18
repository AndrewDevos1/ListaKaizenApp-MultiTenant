import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Modulo, Roles, TenantId } from '../../common/decorators';
import { ModuloGuard, RolesGuard, TenantGuard } from '../../common/guards';
import { AtestadosService } from './atestados.service';
import { CriarAtestadoDto } from './dto/criar-atestado.dto';
import { ListarAtestadosDto } from './dto/listar-atestados.dto';

@ApiTags('Admin — Atestados')
@Controller('v1/admin/atestados')
@Modulo('moduloFuncionarios')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard, ModuloGuard)
@Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
@ApiBearerAuth()
export class AtestadosController {
  constructor(private readonly service: AtestadosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar atestados do restaurante' })
  listar(@TenantId() restauranteId: number, @Query() filters: ListarAtestadosDto) {
    return this.service.listar(restauranteId, filters);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastrar atestado sem alterar banco de horas' })
  criar(@TenantId() restauranteId: number, @CurrentUser('id') adminId: number, @Body() dto: CriarAtestadoDto) {
    return this.service.criar(restauranteId, adminId, dto);
  }

  @Put(':id/cancelar')
  @ApiOperation({ summary: 'Cancelar atestado sem alterar banco de horas' })
  cancelar(@TenantId() restauranteId: number, @CurrentUser('id') adminId: number, @Param('id', ParseIntPipe) id: number) {
    return this.service.cancelar(restauranteId, adminId, id);
  }
}
