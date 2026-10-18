import { Body, Controller, ForbiddenException, Post, UseGuards } from '@nestjs/common';
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

  @Post()
  @ApiOperation({ summary: 'Criar escala de trabalho com vigência' })
  criar(@TenantId() restauranteId: number | null, @CurrentUser('id') adminId: number, @Body() dto: CriarEscalaDto) {
    if (!restauranteId) throw new ForbiddenException('Usuário não está vinculado a nenhum restaurante');
    return this.service.criar(restauranteId, adminId, dto);
  }
}
