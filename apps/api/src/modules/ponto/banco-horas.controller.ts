import { Body, Controller, ForbiddenException, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Modulo, Roles, TenantId } from '../../common/decorators';
import { ModuloGuard, RolesGuard, TenantGuard } from '../../common/guards';
import { BancoHorasService } from './banco-horas.service';
import { CriarLancamentoBancoHorasDto } from './dto/criar-lancamento-banco-horas.dto';

@ApiTags('Admin — Banco de horas')
@Controller('v1/admin/banco-horas')
@Modulo('moduloPonto')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard, ModuloGuard)
@Roles('ADMIN' as any)
@ApiBearerAuth()
export class BancoHorasController {
  constructor(private readonly service: BancoHorasService) {}
  @Get('lancamentos') @ApiOperation({ summary: 'Listar lançamentos do banco de horas' })
  listar(@TenantId() restauranteId: number | null, @Query('usuarioId') usuarioId?: string) { return this.service.listar(this.tenant(restauranteId), usuarioId ? Number(usuarioId) : undefined); }
  @Post('lancamentos') @ApiOperation({ summary: 'Criar lançamento manual auditado' })
  criar(@TenantId() restauranteId: number | null, @CurrentUser('id') adminId: number, @Body() dto: CriarLancamentoBancoHorasDto) { return this.service.criar(this.tenant(restauranteId), adminId, dto); }
  private tenant(id: number | null) { if (!id) throw new ForbiddenException('Usuário não está vinculado a nenhum restaurante'); return id; }
}
