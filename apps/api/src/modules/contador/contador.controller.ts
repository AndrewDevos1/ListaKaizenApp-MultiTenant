import { BadRequestException, Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles, TenantId } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';
import { ContadorService } from './contador.service';

@ApiTags('Contador')
@Controller('v1/contador')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
@Roles('CONTADOR' as any)
@ApiBearerAuth()
export class ContadorController {
  constructor(private readonly service: ContadorService) {}

  @Get('restaurantes')
  restaurantes(@CurrentUser('id') contadorId: number) {
    return this.service.restaurantes(contadorId);
  }

  @Get('funcionarios')
  funcionarios(@CurrentUser('id') contadorId: number, @TenantId() restauranteId: number) {
    return this.service.funcionarios(contadorId, restauranteId);
  }

  @Get('funcionarios/:funcionarioId/ponto')
  ponto(
    @CurrentUser('id') contadorId: number,
    @TenantId() restauranteId: number,
    @Param('funcionarioId', ParseIntPipe) funcionarioId: number,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    const inicio = parseDate(dataInicio);
    const fim = parseDate(dataFim);
    if (inicio && fim && inicio > fim) throw new BadRequestException('Período inválido');
    return this.service.ponto(contadorId, restauranteId, funcionarioId, inicio, fim);
  }

  @Get('funcionarios/:funcionarioId/espelho')
  espelho(
    @CurrentUser('id') contadorId: number,
    @TenantId() restauranteId: number,
    @Param('funcionarioId', ParseIntPipe) funcionarioId: number,
    @Query('competencia') competencia: string,
  ) {
    return this.service.espelhoMensal(contadorId, restauranteId, funcionarioId, competencia);
  }

  @Get('funcionarios/:funcionarioId/documentos')
  documentos(
    @CurrentUser('id') contadorId: number,
    @TenantId() restauranteId: number,
    @Param('funcionarioId', ParseIntPipe) funcionarioId: number,
  ) {
    return this.service.documentos(contadorId, restauranteId, funcionarioId);
  }
}

function parseDate(value?: string) {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('Data inválida');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    throw new BadRequestException('Data inválida');
  }
  return date;
}
