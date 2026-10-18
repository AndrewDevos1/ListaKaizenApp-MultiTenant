import { Body, Controller, ForbiddenException, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Modulo, Roles, TenantId } from '../../common/decorators';
import { ModuloGuard, RolesGuard, TenantGuard } from '../../common/guards';
import { CriarEscalaDto } from './dto/criar-escala.dto';
import { EscalaService } from './escala.service';

@ApiTags('Admin — Escalas de trabalho')
@Controller('v1/admin/escalas-trabalho')
@Modulo('moduloPonto')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard, ModuloGuard)
@Roles('ADMIN' as any)
@ApiBearerAuth()
export class EscalaController {
  constructor(private readonly service: EscalaService) {}

  @Get()
  @ApiOperation({ summary: 'Listar escalas de trabalho' })
  listar(@TenantId() restauranteId: number | null, @Query('usuarioId') usuarioId?: string) {
    return this.service.listar(this.tenant(restauranteId), usuarioId ? Number(usuarioId) : undefined);
  }

  @Post()
  @ApiOperation({ summary: 'Criar escala de trabalho com vigência' })
  criar(@TenantId() restauranteId: number | null, @CurrentUser('id') adminId: number, @Body() dto: CriarEscalaDto) {
    return this.service.criar(this.tenant(restauranteId), adminId, dto);
  }

  private tenant(id: number | null) {
    if (!id) throw new ForbiddenException('Usuário não está vinculado a nenhum restaurante');
    return id;
  }
}
