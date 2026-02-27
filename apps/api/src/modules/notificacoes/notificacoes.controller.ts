import {
  Controller,
  Get,
  Put,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificacoesService } from './notificacoes.service';
import { CurrentUser, Roles, TenantId } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';

@ApiTags('Notificacoes')
@Controller('v1/notificacoes')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
@ApiBearerAuth()
export class NotificacoesController {
  constructor(private readonly notificacoesService: NotificacoesService) {}

  @Get()
  @Roles('COLLABORATOR' as any, 'ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Listar notificações do usuário' })
  findAll(
    @CurrentUser('id') usuarioId: number,
    @TenantId() restauranteId: number,
  ) {
    return this.notificacoesService.findAll(usuarioId, restauranteId);
  }

  @Get('count')
  @Roles('COLLABORATOR' as any, 'ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Contar notificações não lidas' })
  contarNaoLidas(
    @CurrentUser('id') usuarioId: number,
    @TenantId() restauranteId: number,
  ) {
    return this.notificacoesService.contarNaoLidas(usuarioId, restauranteId);
  }

  @Put('marcar-todas')
  @Roles('COLLABORATOR' as any, 'ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Marcar todas as notificações como lidas' })
  marcarTodasLidas(
    @CurrentUser('id') usuarioId: number,
    @TenantId() restauranteId: number,
  ) {
    return this.notificacoesService.marcarTodasLidas(usuarioId, restauranteId);
  }

  @Put(':id/lida')
  @Roles('COLLABORATOR' as any, 'ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Marcar notificação como lida' })
  marcarLida(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') usuarioId: number,
  ) {
    return this.notificacoesService.marcarLida(id, usuarioId);
  }
}
