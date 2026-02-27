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
import { ListasService } from './listas.service';
import { CreateListaDto } from './dto/create-lista.dto';
import { UpdateListaDto } from './dto/update-lista.dto';
import { AddColaboradorDto } from './dto/add-colaborador.dto';
import { AddItemRefDto } from './dto/add-item-ref.dto';
import { AtualizarEstoqueDto } from './dto/atualizar-estoque.dto';
import { CurrentUser, Roles, TenantId } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';

@ApiTags('Listas')
@Controller('v1/listas')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
@ApiBearerAuth()
export class ListasController {
  constructor(private listasService: ListasService) {}

  @Post()
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Criar lista' })
  create(@Body() dto: CreateListaDto, @TenantId() restauranteId: number) {
    return this.listasService.create(dto, restauranteId);
  }

  @Get()
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Listar todas as listas do restaurante' })
  findAll(@TenantId() restauranteId: number) {
    return this.listasService.findAll(restauranteId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhes da lista' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.listasService.findOne(id, restauranteId);
  }

  @Put(':id')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Atualizar lista' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateListaDto,
    @TenantId() restauranteId: number,
  ) {
    return this.listasService.update(id, dto, restauranteId);
  }

  @Delete(':id')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Deletar lista (soft delete)' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.listasService.remove(id, restauranteId);
  }

  // Colaboradores
  @Post(':id/colaboradores')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Adicionar colaborador à lista' })
  addColaborador(
    @Param('id', ParseIntPipe) listaId: number,
    @Body() dto: AddColaboradorDto,
    @TenantId() restauranteId: number,
  ) {
    return this.listasService.addColaborador(
      listaId,
      dto.usuarioId,
      restauranteId,
    );
  }

  @Delete(':id/colaboradores/:userId')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Remover colaborador da lista' })
  removeColaborador(
    @Param('id', ParseIntPipe) listaId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @TenantId() restauranteId: number,
  ) {
    return this.listasService.removeColaborador(listaId, userId, restauranteId);
  }

  // Items
  @Post(':id/itens')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Adicionar item à lista' })
  addItemRef(
    @Param('id', ParseIntPipe) listaId: number,
    @Body() dto: AddItemRefDto,
    @TenantId() restauranteId: number,
  ) {
    return this.listasService.addItemRef(
      listaId,
      dto.itemId,
      dto.quantidadeMinima || 0,
      restauranteId,
    );
  }

  @Delete(':id/itens/:itemId')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Remover item da lista' })
  removeItemRef(
    @Param('id', ParseIntPipe) listaId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @TenantId() restauranteId: number,
  ) {
    return this.listasService.removeItemRef(listaId, itemId, restauranteId);
  }

  @Get(':id/itens')
  @ApiOperation({ summary: 'Listar itens da lista' })
  getListaItens(
    @Param('id', ParseIntPipe) listaId: number,
    @TenantId() restauranteId: number,
  ) {
    return this.listasService.getListaItens(listaId, restauranteId);
  }
}

@ApiTags('Colaborador')
@Controller('v1/collaborator')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
@ApiBearerAuth()
export class CollaboratorListasController {
  constructor(private listasService: ListasService) {}

  @Get('minhas-listas')
  @ApiOperation({ summary: 'Listas atribuídas ao colaborador logado' })
  getMinhasListas(@CurrentUser('id') userId: number) {
    return this.listasService.getMinhasListas(userId);
  }

  @Put('listas/:id/estoque')
  @ApiOperation({ summary: 'Atualizar quantidades de estoque da lista' })
  atualizarEstoque(
    @Param('id', ParseIntPipe) listaId: number,
    @TenantId() restauranteId: number,
    @Body() dto: AtualizarEstoqueDto,
  ) {
    return this.listasService.atualizarEstoque(listaId, restauranteId, dto);
  }

  @Post('listas/:id/submeter')
  @ApiOperation({ summary: 'Submeter lista para aprovação do admin' })
  submeterLista(
    @Param('id', ParseIntPipe) listaId: number,
    @TenantId() restauranteId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.listasService.submeterLista(listaId, restauranteId, userId);
  }
}
