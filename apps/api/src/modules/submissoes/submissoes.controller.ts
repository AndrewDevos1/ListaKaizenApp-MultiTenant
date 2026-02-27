import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SubmissoesService } from './submissoes.service';
import { FilterSubmissoesDto } from './dto/filter-submissoes.dto';
import { UpdatePedidoStatusDto } from './dto/update-pedido-status.dto';
import { CurrentUser, Roles, TenantId } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';

// ─── Admin Controller ────────────────────────────────────────────────────────

@ApiTags('Admin — Submissoes')
@Controller('v1/admin')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
@ApiBearerAuth()
export class AdminSubmissoesController {
  constructor(private submissoesService: SubmissoesService) {}

  @Get('submissoes')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Listar submissões do restaurante' })
  findAll(
    @TenantId() restauranteId: number,
    @Query() filter: FilterSubmissoesDto,
  ) {
    return this.submissoesService.findAllAdmin(restauranteId, filter);
  }

  @Get('submissoes/:id')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Detalhe de uma submissão com pedidos' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.submissoesService.findOneAdmin(id, restauranteId);
  }

  @Post('submissoes/:id/aprovar')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Aprovar todos os pedidos PENDENTE da submissão' })
  aprovar(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.submissoesService.aprovarSubmissao(id, restauranteId);
  }

  @Post('submissoes/:id/rejeitar')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Rejeitar todos os pedidos PENDENTE da submissão' })
  rejeitar(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.submissoesService.rejeitarSubmissao(id, restauranteId);
  }

  @Put('pedidos/:id/status')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Atualizar status de um pedido individual' })
  updatePedidoStatus(
    @Param('id', ParseIntPipe) pedidoId: number,
    @TenantId() restauranteId: number,
    @Body() dto: UpdatePedidoStatusDto,
  ) {
    return this.submissoesService.updatePedidoStatus(
      pedidoId,
      restauranteId,
      dto,
    );
  }

  @Put('submissoes/:id/reverter')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Reverter todos os pedidos para PENDENTE' })
  reverter(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.submissoesService.reverterSubmissao(id, restauranteId);
  }

  @Put('submissoes/:id/arquivar')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Arquivar submissão' })
  arquivar(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.submissoesService.arquivarSubmissao(id, restauranteId);
  }
}

// ─── Colaborador Controller ──────────────────────────────────────────────────

@ApiTags('Colaborador — Submissoes')
@Controller('v1/collaborator/submissoes')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
@ApiBearerAuth()
export class CollaboratorSubmissoesController {
  constructor(private submissoesService: SubmissoesService) {}

  @Get()
  @ApiOperation({ summary: 'Minhas submissões' })
  findAll(
    @CurrentUser('id') userId: number,
    @TenantId() restauranteId: number,
  ) {
    return this.submissoesService.findAllColaborador(userId, restauranteId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de uma submissão (somente leitura)' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id') userId: number,
    @TenantId() restauranteId: number,
  ) {
    return this.submissoesService.findOneColaborador(id, userId, restauranteId);
  }
}
