import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AreasService } from './areas.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { SetColaboradoresDto } from './dto/set-colaboradores.dto';
import { SetListasDto } from './dto/set-listas.dto';
import { AtualizarEstoqueAreaDto } from './dto/atualizar-estoque-area.dto';
import { CurrentUser, Roles, TenantId } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';

@ApiTags('Areas')
@Controller('v1/areas')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
@ApiBearerAuth()
export class AreasController {
  constructor(private areasService: AreasService) {}

  @Post()
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Criar área' })
  create(@Body() dto: CreateAreaDto, @TenantId() restauranteId: number) {
    return this.areasService.create(dto, restauranteId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar áreas do restaurante' })
  findAll(@TenantId() restauranteId: number) {
    return this.areasService.findAll(restauranteId);
  }

  @Get(':id/colaboradores')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Listar colaboradores da área' })
  getColaboradores(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.areasService.getColaboradores(id, restauranteId);
  }

  @Post(':id/colaboradores')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Definir colaboradores da área (substitui todos)' })
  setColaboradores(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetColaboradoresDto,
    @TenantId() restauranteId: number,
  ) {
    return this.areasService.setColaboradores(id, dto, restauranteId);
  }

  @Get(':id/listas')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Listar listas da área' })
  getListas(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.areasService.getListas(id, restauranteId);
  }

  @Post(':id/listas')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Definir listas da área (substitui todas)' })
  setListas(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetListasDto,
    @TenantId() restauranteId: number,
  ) {
    return this.areasService.setListas(id, dto, restauranteId);
  }

  @Get(':id/estoque')
  @ApiOperation({ summary: 'Retornar estoque completo da área' })
  getEstoque(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.areasService.getEstoque(id, restauranteId, false);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Status de pendências da área' })
  getStatus(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.areasService.getStatus(id, restauranteId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhes da área' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.areasService.findOne(id, restauranteId);
  }

  @Put(':id')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Atualizar área' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAreaDto,
    @TenantId() restauranteId: number,
  ) {
    return this.areasService.update(id, dto, restauranteId);
  }

  @Delete(':id')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Remover área' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.areasService.remove(id, restauranteId);
  }
}

@ApiTags('Colaborador — Áreas')
@Controller('v1/collaborator')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
@ApiBearerAuth()
export class CollaboratorAreasController {
  constructor(private areasService: AreasService) {}

  @Get('minhas-areas')
  @ApiOperation({ summary: 'Áreas atribuídas ao colaborador' })
  getMinhasAreas(
    @CurrentUser('id') userId: number,
    @TenantId() restauranteId: number,
  ) {
    return this.areasService.getMinhasAreas(userId, restauranteId);
  }

  @Get('minhas-areas-status')
  @ApiOperation({ summary: 'Áreas do colaborador com status de pendências' })
  getMinhasAreasStatus(
    @CurrentUser('id') userId: number,
    @TenantId() restauranteId: number,
  ) {
    return this.areasService.getMinhasAreasStatus(userId, restauranteId);
  }

  @Get('areas/:id/estoque')
  @ApiOperation({ summary: 'Estoque da área (itens com quantidade_minima > 0)' })
  getEstoque(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.areasService.getEstoque(id, restauranteId, true);
  }

  @Put('areas/:id/estoque')
  @ApiOperation({ summary: 'Atualizar quantidades de estoque da área' })
  atualizarEstoque(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
    @Body() dto: AtualizarEstoqueAreaDto,
  ) {
    return this.areasService.atualizarEstoqueArea(id, restauranteId, dto);
  }

  @Post('areas/:id/submeter')
  @ApiOperation({ summary: 'Submeter área — cria submissões para listas com itens abaixo do mínimo' })
  submeterArea(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.areasService.submeterArea(id, restauranteId, userId);
  }
}
