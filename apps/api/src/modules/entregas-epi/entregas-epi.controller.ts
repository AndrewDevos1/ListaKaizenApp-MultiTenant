import { Body, Controller, Get, Headers, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, Modulo, Roles, TenantId } from '../../common/decorators';
import { ModuloGuard, RolesGuard, TenantGuard } from '../../common/guards';
import { SuperAdminTenantGuard } from '../almoxarifado/super-admin-tenant.guard';
import { CriarEntregaEpiDto, RecusarEntregaEpiDto } from './dto/criar-entrega-epi.dto';
import { BaixaAdministrativaEpiDto, DevolverEpiDto, RegistrarOcorrenciaEpiDto } from './dto/devolucao-epi.dto';
import { EntregasEpiService } from './entregas-epi.service';

@Controller('v1')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard, SuperAdminTenantGuard, ModuloGuard)
@Modulo('moduloAlmoxarifadoEpi')
export class EntregasEpiController {
  constructor(private readonly service: EntregasEpiService) {}
  @Post('admin/entregas-epi') @Roles('ADMIN' as any, 'SUPER_ADMIN' as any) criar(@TenantId() t: number, @CurrentUser() u: any, @Body() d: CriarEntregaEpiDto) { return this.service.criar(t, u, d); }
  @Get('admin/entregas-epi') @Roles('ADMIN' as any, 'SUPER_ADMIN' as any) listarAdmin(@TenantId() t: number) { return this.service.listar(t); }
  @Get('admin/entregas-epi/:id') @Roles('ADMIN' as any, 'SUPER_ADMIN' as any) detalheAdmin(@TenantId() t: number, @Param('id', ParseIntPipe) id: number) { return this.service.detalhe(t, id); }
  @Post('admin/entregas-epi/:id/confirmar-entrega-fisica') @Roles('ADMIN' as any, 'SUPER_ADMIN' as any) confirmarFisica(@TenantId() t: number, @CurrentUser() u: any, @Param('id', ParseIntPipe) id: number, @Headers('idempotency-key') chave: string, @Body('chaveIdempotencia') bodyChave?: string) { return this.service.confirmarEntregaFisica(t, id, u, chave ?? bodyChave); }
  @Post('admin/entregas-epi/:id/cancelar') @Roles('ADMIN' as any, 'SUPER_ADMIN' as any) cancelar(@TenantId() t: number, @CurrentUser() u: any, @Param('id', ParseIntPipe) id: number, @Body('chaveIdempotencia') chave: string) { return this.service.cancelar(t, id, u, chave); }
  @Get('collaborator/entregas-epi') @Roles('COLLABORATOR' as any) listar(@TenantId() t: number, @CurrentUser('id') u: number) { return this.service.listar(t, u); }
  @Get('collaborator/entregas-epi/:id') @Roles('COLLABORATOR' as any) detalhe(@TenantId() t: number, @CurrentUser('id') u: number, @Param('id', ParseIntPipe) id: number) { return this.service.detalhe(t, id, u); }
  @Post('collaborator/entregas-epi/:id/aceitar') @Roles('COLLABORATOR' as any) aceitar(@TenantId() t: number, @CurrentUser('id') u: number, @Param('id', ParseIntPipe) id: number, @Body('chaveIdempotencia') chave: string) { return this.service.aceitar(t, u, id, chave); }
  @Post('collaborator/entregas-epi/:id/recusar') @Roles('COLLABORATOR' as any) recusar(@TenantId() t: number, @CurrentUser('id') u: number, @Param('id', ParseIntPipe) id: number, @Body() d: RecusarEntregaEpiDto) { return this.service.recusar(t, u, id, d); }
  @Post('admin/custodias-epi/:id/devolucoes') @Roles('ADMIN' as any, 'SUPER_ADMIN' as any) devolverAdmin(@TenantId() t: number, @CurrentUser() u: any, @Param('id', ParseIntPipe) id: number, @Headers('idempotency-key') chave: string, @Body() d: DevolverEpiDto) { return this.service.devolver(t, u, id, { ...d, chaveIdempotencia: chave ?? d.chaveIdempotencia }); }
  @Post('collaborator/custodias-epi/:id/devolucoes') @Roles('COLLABORATOR' as any) devolverColaborador(@TenantId() t: number, @CurrentUser() u: any, @Param('id', ParseIntPipe) id: number, @Headers('idempotency-key') chave: string, @Body() d: DevolverEpiDto) { return this.service.devolver(t, u, id, { ...d, chaveIdempotencia: chave ?? d.chaveIdempotencia }); }
  @Post('admin/custodias-epi/:id/ocorrencias') @Roles('ADMIN' as any, 'SUPER_ADMIN' as any) ocorrenciaAdmin(@TenantId() t: number, @CurrentUser() u: any, @Param('id', ParseIntPipe) id: number, @Body() d: RegistrarOcorrenciaEpiDto) { return this.service.registrarOcorrencia(t, u, id, d); }
  @Post('collaborator/custodias-epi/:id/ocorrencias') @Roles('COLLABORATOR' as any) ocorrenciaColaborador(@TenantId() t: number, @CurrentUser() u: any, @Param('id', ParseIntPipe) id: number, @Body() d: RegistrarOcorrenciaEpiDto) { return this.service.registrarOcorrencia(t, u, id, d); }
  @Post('admin/custodias-epi/:id/baixas') @Roles('ADMIN' as any, 'SUPER_ADMIN' as any) baixaAdmin(@TenantId() t: number, @CurrentUser() u: any, @Param('id', ParseIntPipe) id: number, @Body() d: BaixaAdministrativaEpiDto) { return this.service.registrarOcorrencia(t, u, id, { ...d, tipo: 'BAIXA_ADMINISTRATIVA' }); }
}
