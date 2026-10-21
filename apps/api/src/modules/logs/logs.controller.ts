import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { LogsService } from './logs.service';
import { Roles } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';

@ApiTags('Admin — Logs')
@Controller('v1/admin/logs')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
@ApiBearerAuth()
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  @Roles('SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Listar logs paginados (somente SUPER_ADMIN)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'restauranteId', required: false, type: Number })
  @ApiQuery({ name: 'usuarioId', required: false, type: Number })
  @ApiQuery({ name: 'acao', required: false, type: String })
  @ApiQuery({ name: 'entidade', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('restauranteId') restauranteId?: string,
    @Query('usuarioId') usuarioId?: string,
    @Query('acao') acao?: string,
    @Query('entidade') entidade?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 50;
    const restauranteIdNum = restauranteId ? parseInt(restauranteId) : undefined;
    const usuarioIdNum = usuarioId ? parseInt(usuarioId) : undefined;

    if (restauranteId && Number.isNaN(restauranteIdNum)) {
      throw new BadRequestException('restauranteId inválido');
    }
    if (usuarioId && Number.isNaN(usuarioIdNum)) {
      throw new BadRequestException('usuarioId inválido');
    }

    const parsedStartDate = startDate ? new Date(startDate) : undefined;
    const parsedEndDate = endDate ? new Date(endDate) : undefined;
    if (startDate && Number.isNaN(parsedStartDate?.getTime())) {
      throw new BadRequestException('startDate inválida');
    }
    if (endDate && Number.isNaN(parsedEndDate?.getTime())) {
      throw new BadRequestException('endDate inválida');
    }

    return this.logsService.findAll({
      restauranteId: restauranteIdNum,
      usuarioId: usuarioIdNum,
      acao: acao?.trim() || undefined,
      entidade: entidade?.trim() || undefined,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      page: pageNum,
      limit: limitNum,
    });
  }
}
