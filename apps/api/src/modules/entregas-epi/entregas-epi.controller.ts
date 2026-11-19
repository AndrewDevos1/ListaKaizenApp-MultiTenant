import { Body, Controller, Get, Headers, Param, ParseIntPipe, Post, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { CurrentUser, Modulo, Roles, TenantId } from '../../common/decorators';
import { ModuloGuard, RolesGuard, TenantGuard } from '../../common/guards';
import { SuperAdminTenantGuard } from '../almoxarifado/super-admin-tenant.guard';
import { CriarEntregaEpiDto, RecusarEntregaEpiDto } from './dto/criar-entrega-epi.dto';
import { AceitarTermoEpiDto } from './dto/aceitar-termo-epi.dto';
import { AceiteTermoEpiService } from './aceite-termo-epi.service';
import { EntregasEpiService } from './entregas-epi.service';

@Controller('v1')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard, SuperAdminTenantGuard, ModuloGuard)
@Modulo('moduloAlmoxarifadoEpi')
export class EntregasEpiController {
  constructor(private readonly service: EntregasEpiService, private readonly termos: AceiteTermoEpiService) {}
  @Post('admin/entregas-epi') @Roles('ADMIN' as any, 'SUPER_ADMIN' as any) criar(@TenantId() t: number, @CurrentUser() u: any, @Body() d: CriarEntregaEpiDto) { return this.service.criar(t, u, d); }
  @Get('admin/entregas-epi') @Roles('ADMIN' as any, 'SUPER_ADMIN' as any) listarAdmin(@TenantId() t: number) { return this.service.listar(t); }
  @Get('admin/entregas-epi/:id') @Roles('ADMIN' as any, 'SUPER_ADMIN' as any) detalheAdmin(@TenantId() t: number, @Param('id', ParseIntPipe) id: number) { return this.service.detalhe(t, id); }
  @Post('admin/entregas-epi/:id/confirmar-entrega-fisica') @Roles('ADMIN' as any, 'SUPER_ADMIN' as any) confirmarFisica(@TenantId() t: number, @CurrentUser() u: any, @Param('id', ParseIntPipe) id: number, @Headers('idempotency-key') chave: string, @Body('chaveIdempotencia') bodyChave?: string) { return this.service.confirmarEntregaFisica(t, id, u, chave ?? bodyChave); }
  @Post('admin/entregas-epi/:id/cancelar') @Roles('ADMIN' as any, 'SUPER_ADMIN' as any) cancelar(@TenantId() t: number, @CurrentUser() u: any, @Param('id', ParseIntPipe) id: number, @Body('chaveIdempotencia') chave: string) { return this.service.cancelar(t, id, u, chave); }
  @Post('admin/termos-responsabilidade') @Roles('ADMIN' as any, 'SUPER_ADMIN' as any) criarTermo(@TenantId() t: number, @CurrentUser('id') u: number, @Body() d: { versao: string; texto: string }) { return this.termos.criarTermo(t, u, d.versao, d.texto); }
  @Get('admin/termos-responsabilidade') @Roles('ADMIN' as any, 'SUPER_ADMIN' as any) listarTermosAdmin(@TenantId() t: number) { return this.termos.listarTermos(t); }
  @Get('collaborator/entregas-epi') @Roles('COLLABORATOR' as any) listar(@TenantId() t: number, @CurrentUser('id') u: number) { return this.service.listar(t, u); }
  @Get('collaborator/entregas-epi/:id') @Roles('COLLABORATOR' as any) detalhe(@TenantId() t: number, @CurrentUser('id') u: number, @Param('id', ParseIntPipe) id: number) { return this.service.detalhe(t, id, u); }
  @Get('collaborator/termos-responsabilidade') @Roles('COLLABORATOR' as any) listarTermos(@TenantId() t: number) { return this.termos.listarTermos(t); }
  // Contrato #49: aceite eletrônico legado permanece nesta rota e usa chaveIdempotencia.
  @Post('collaborator/entregas-epi/:id/aceitar') @Roles('COLLABORATOR' as any) aceitar(@TenantId() t: number, @CurrentUser('id') u: number, @Param('id', ParseIntPipe) id: number, @Body('chaveIdempotencia') chave: string) { return this.service.aceitar(t, u, id, chave); }
  @Post('collaborator/entregas-epi/:id/aceitar-termo') @Roles('COLLABORATOR' as any) aceitarTermo(@TenantId() t: number, @CurrentUser('id') u: number, @Param('id', ParseIntPipe) id: number, @Body() d: AceitarTermoEpiDto) { return this.termos.aceitar(t, u, id, d); }
  @Get('collaborator/termos-responsabilidade/aceites/:id/pdf') @Roles('COLLABORATOR' as any) async pdfProprio(@TenantId() t: number, @CurrentUser('id') u: number, @Param('id', ParseIntPipe) id: number, @Res() res: Response) { const pdf = await this.termos.obterPdf(t, id, u); res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="termo-${id}.pdf"`, 'X-Document-Hash': pdf.hash }); res.send(pdf.bytes); }
  @Get('admin/termos-responsabilidade/aceites/:id/pdf') @Roles('ADMIN' as any, 'SUPER_ADMIN' as any) async pdfAdmin(@TenantId() t: number, @Param('id', ParseIntPipe) id: number, @Res() res: Response) { const pdf = await this.termos.obterPdf(t, id); res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="termo-${id}.pdf"`, 'X-Document-Hash': pdf.hash }); res.send(pdf.bytes); }
  @Post('collaborator/entregas-epi/:id/recusar') @Roles('COLLABORATOR' as any) recusar(@TenantId() t: number, @CurrentUser('id') u: number, @Param('id', ParseIntPipe) id: number, @Body() d: RecusarEntregaEpiDto) { return this.service.recusar(t, u, id, d); }
}
