import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StatusListaRapida } from '@prisma/client';
import { CurrentUser, Roles, TenantId } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';
import { CreateListaRapidaDto } from './dto/create-lista-rapida.dto';
import { AddItemListaRapidaDto } from './dto/add-item-lista-rapida.dto';
import { UpdateListaRapidaItemDto } from './dto/update-lista-rapida-item.dto';
import { ListasRapidasService } from './listas-rapidas.service';

// ─── Colaborador Controller ──────────────────────────────────────────────────

@ApiTags('Colaborador — Listas Rápidas')
@Controller('v1/collaborator/listas-rapidas')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
@Roles('COLLABORATOR' as any, 'ADMIN' as any, 'SUPER_ADMIN' as any)
@ApiBearerAuth()
export class CollaboratorListasRapidasController {
  constructor(private readonly service: ListasRapidasService) {}

  @Post()
  @ApiOperation({ summary: 'Criar lista rápida' })
  create(
    @TenantId() restauranteId: number,
    @CurrentUser() user: any,
    @Body() dto: CreateListaRapidaDto,
  ) {
    return this.service.create(restauranteId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar minhas listas rápidas' })
  findAll(
    @TenantId() restauranteId: number,
    @CurrentUser() user: any,
  ) {
    return this.service.findAllByColaborador(user.sub, restauranteId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de uma lista rápida' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.service.findOne(id, restauranteId);
  }

  @Post(':id/submeter')
  @ApiOperation({ summary: 'Submeter lista rápida para revisão' })
  submeter(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
    @CurrentUser() user: any,
  ) {
    return this.service.submeter(id, user.sub, restauranteId);
  }

  @Post(':id/itens')
  @ApiOperation({ summary: 'Adicionar item à lista rápida' })
  addItem(
    @Param('id', ParseIntPipe) listaRapidaId: number,
    @TenantId() restauranteId: number,
    @Body() dto: AddItemListaRapidaDto,
  ) {
    return this.service.addItem(listaRapidaId, restauranteId, dto);
  }
}

// ─── Admin Controller ────────────────────────────────────────────────────────

@ApiTags('Admin — Listas Rápidas')
@Controller('v1/admin/listas-rapidas')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
@Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
@ApiBearerAuth()
export class AdminListasRapidasController {
  constructor(private readonly service: ListasRapidasService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas as listas rápidas do restaurante' })
  findAll(
    @TenantId() restauranteId: number,
    @Query('status', new ParseEnumPipe(StatusListaRapida, { optional: true }))
    status?: StatusListaRapida,
  ) {
    return this.service.findAllAdmin(restauranteId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de uma lista rápida' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.service.findOne(id, restauranteId);
  }

  @Put(':id/aprovar')
  @ApiOperation({ summary: 'Aprovar lista rápida' })
  aprovar(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.service.aprovar(id, restauranteId);
  }

  @Put(':id/rejeitar')
  @ApiOperation({ summary: 'Rejeitar lista rápida' })
  rejeitar(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.service.rejeitar(id, restauranteId);
  }

  @Put(':id/arquivar')
  @ApiOperation({ summary: 'Arquivar lista rápida' })
  arquivar(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.service.arquivar(id, restauranteId);
  }

  @Put('itens/:itemId')
  @ApiOperation({ summary: 'Atualizar item da lista rápida' })
  updateItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @TenantId() restauranteId: number,
    @Body() dto: UpdateListaRapidaItemDto,
  ) {
    return this.service.updateItem(itemId, restauranteId, dto);
  }

  @Put('itens/:itemId/descartar')
  @ApiOperation({ summary: 'Toggle descartado no item da lista rápida' })
  descartar(
    @Param('itemId', ParseIntPipe) itemId: number,
    @TenantId() restauranteId: number,
  ) {
    return this.service.descartar(itemId, restauranteId);
  }
}
