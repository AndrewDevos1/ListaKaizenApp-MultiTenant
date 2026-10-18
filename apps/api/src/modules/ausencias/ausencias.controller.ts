import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Modulo, Roles, TenantId } from '../../common/decorators';
import { ModuloGuard, RolesGuard, TenantGuard } from '../../common/guards';
import { AusenciasService } from './ausencias.service';
import { ClassificarAusenciaDto } from './dto/classificar-ausencia.dto';
import { ListarAusenciasDto } from './dto/listar-ausencias.dto';

@ApiTags('Admin — Ausências')
@Controller('v1/admin/ausencias')
@Modulo('moduloFuncionarios')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard, ModuloGuard)
@Roles('ADMIN' as any)
@ApiBearerAuth()
export class AusenciasController {
  constructor(private readonly service: AusenciasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar classificações de ausência do restaurante' })
  listar(
    @TenantId() restauranteId: number,
    @Query() filters: ListarAusenciasDto,
  ) {
    return this.service.listar(restauranteId, filters);
  }

  @Post('classificar')
  @ApiOperation({ summary: 'Classificar ausência como falta ou folga' })
  classificar(
    @TenantId() restauranteId: number,
    @CurrentUser('id') adminId: number,
    @Body() dto: ClassificarAusenciaDto,
  ) {
    return this.service.classificar(restauranteId, adminId, dto);
  }
}
