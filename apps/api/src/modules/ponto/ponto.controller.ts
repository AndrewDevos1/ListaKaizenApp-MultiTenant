import { BadRequestException, Body, Controller, ForbiddenException, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Modulo, Roles, TenantId } from '../../common/decorators';
import { ModuloGuard, RolesGuard, TenantGuard } from '../../common/guards';
import { RegistrarPontoDto } from './dto/registrar-ponto.dto';
import { PontoService } from './ponto.service';

@ApiTags('Colaborador — Ponto')
@Controller('v1/collaborator/ponto')
@Modulo('moduloPonto')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard, ModuloGuard)
@Roles('COLLABORATOR' as any, 'ADMIN' as any)
@ApiBearerAuth()
export class PontoController {
  constructor(private readonly service: PontoService) {}

  @Post('registrar')
  @ApiOperation({ summary: 'Registrar próxima batida de ponto' })
  registrar(
    @CurrentUser('id') usuarioId: number,
    @TenantId() restauranteId: number,
    @Body() dto: RegistrarPontoDto,
  ) {
    return this.service.registrar(usuarioId, this.requireTenant(restauranteId), dto);
  }

  @Get('status')
  @ApiOperation({ summary: 'Consultar status da própria jornada' })
  status(
    @CurrentUser('id') usuarioId: number,
    @TenantId() restauranteId: number,
  ) {
    return this.service.status(usuarioId, this.requireTenant(restauranteId));
  }

  @Get('historico')
  @ApiOperation({ summary: 'Consultar próprio histórico de ponto' })
  historico(
    @CurrentUser('id') usuarioId: number,
    @TenantId() restauranteId: number,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    return this.service.historico(
      usuarioId,
      this.requireTenant(restauranteId),
      parseData(dataInicio),
      parseData(dataFim),
    );
  }

  private requireTenant(restauranteId: number | undefined) {
    if (!restauranteId) {
      throw new ForbiddenException('Usuário não está vinculado a nenhum restaurante');
    }
    return restauranteId;
  }
}

function parseData(value?: string) {
  if (!value) return undefined;
  const data = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(data.valueOf()) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException('Data inválida');
  }
  return data;
}
