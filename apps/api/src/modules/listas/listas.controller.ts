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
import { UpdateItemRefDto } from './dto/update-item-ref.dto';
import { AssignColaboradoresDto } from './dto/assign-colaboradores.dto';
import { ImportCsvDto } from './dto/import-csv.dto';
import { CurrentUser, Roles, TenantId } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';
import { AddItemByNomeDto } from './dto/add-item-by-nome.dto';
import { UpdateMaeItemDto } from './dto/update-mae-item.dto';
import { BulkImportNamesDto } from './dto/bulk-import-names.dto';
import { CopyMoveItemsDto } from './dto/copy-move-items.dto';
import { AtribuirFornecedorDto } from './dto/atribuir-fornecedor.dto';

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

  @Get('deletadas')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Listar listas deletadas (lixeira)' })
  findAllDeleted(@TenantId() restauranteId: number) {
    return this.listasService.findAllDeleted(restauranteId);
  }

  @Post(':id/restaurar')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Restaurar lista da lixeira' })
  restore(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.listasService.restore(id, restauranteId);
  }

  @Delete(':id/permanente')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Deletar lista permanentemente' })
  permanentDelete(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.listasService.permanentDelete(id, restauranteId);
  }

  @Post('batch-permanente')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Deletar múltiplas listas permanentemente (da lixeira)' })
  batchPermanentDelete(
    @Body() body: { ids: number[] },
    @TenantId() restauranteId: number,
  ) {
    return this.listasService.permanentDeleteBatch(body.ids, restauranteId);
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

  @Put(':listaId/itens/:itemRefId')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Atualizar configuração de item na lista (threshold, fardo, mínimo)' })
  updateItemRef(
    @Param('listaId') listaId: string,
    @Param('itemRefId') itemRefId: string,
    @Body() dto: UpdateItemRefDto,
    @TenantId() restauranteId: number,
  ) {
    return this.listasService.updateItemRef(
      parseInt(listaId),
      parseInt(itemRefId),
      dto,
      restauranteId,
    );
  }

  @Post(':id/assign')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Substituir todos os colaboradores da lista' })
  assign(
    @Param('id', ParseIntPipe) listaId: number,
    @Body() dto: AssignColaboradoresDto,
    @TenantId() restauranteId: number,
  ) {
    return this.listasService.assign(listaId, dto.colaboradorIds, restauranteId);
  }

  @Get(':id/export-csv')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Exportar itens da lista como CSV' })
  exportCsv(
    @Param('id', ParseIntPipe) listaId: number,
    @TenantId() restauranteId: number,
  ) {
    return this.listasService.exportCsv(listaId, restauranteId);
  }

  @Post(':id/import-csv')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Importar itens para a lista via CSV' })
  importCsv(
    @Param('id', ParseIntPipe) listaId: number,
    @Body() dto: ImportCsvDto,
    @TenantId() restauranteId: number,
  ) {
    return this.listasService.importFromCsv(listaId, dto.texto, restauranteId);
  }

  // ── Lista Mãe ──────────────────────────────────────────────

  @Get(':id/lista-mae')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Dados completos da lista mãe (catálogo de itens)' })
  getListaMae(
    @Param('id', ParseIntPipe) listaId: number,
    @TenantId() restauranteId: number,
  ) {
    return this.listasService.getListaMae(listaId, restauranteId);
  }

  @Post(':id/mae-itens')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Adicionar item à lista mãe pelo nome' })
  addItemByNome(
    @Param('id', ParseIntPipe) listaId: number,
    @Body() dto: AddItemByNomeDto,
    @TenantId() restauranteId: number,
  ) {
    return this.listasService.addItemByNome(
      listaId,
      dto.nome,
      dto.unidadeMedida,
      dto.quantidadeAtual ?? 0,
      dto.quantidadeMinima ?? 0,
      restauranteId,
    );
  }

  @Put(':id/mae-itens/:itemRefId')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Atualizar item da lista mãe (nome, unidade, qtds, fardo)' })
  updateMaeItem(
    @Param('id', ParseIntPipe) listaId: number,
    @Param('itemRefId', ParseIntPipe) itemRefId: number,
    @Body() dto: UpdateMaeItemDto,
    @TenantId() restauranteId: number,
  ) {
    return this.listasService.updateMaeItem(listaId, itemRefId, dto, restauranteId);
  }

  @Delete(':id/mae-itens/:itemRefId')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Remover item da lista mãe pelo itemRefId' })
  deleteMaeItem(
    @Param('id', ParseIntPipe) listaId: number,
    @Param('itemRefId', ParseIntPipe) itemRefId: number,
    @TenantId() restauranteId: number,
  ) {
    return this.listasService.deleteMaeItem(listaId, itemRefId, restauranteId);
  }

  @Post(':id/items-import')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Importar itens em lote pelo nome (um por linha)' })
  bulkImportByName(
    @Param('id', ParseIntPipe) listaId: number,
    @Body() dto: BulkImportNamesDto,
    @TenantId() restauranteId: number,
  ) {
    return this.listasService.bulkImportByName(listaId, dto.nomes, restauranteId);
  }

  @Post(':id/itens/copiar')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Copiar itens para outra lista' })
  copyItems(
    @Param('id', ParseIntPipe) listaId: number,
    @Body() dto: CopyMoveItemsDto,
    @TenantId() restauranteId: number,
  ) {
    return this.listasService.copyItems(listaId, dto, restauranteId);
  }

  @Post(':id/itens/mover')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Mover itens para outra lista' })
  moveItems(
    @Param('id', ParseIntPipe) listaId: number,
    @Body() dto: CopyMoveItemsDto,
    @TenantId() restauranteId: number,
  ) {
    return this.listasService.moveItems(listaId, dto, restauranteId);
  }

  @Post(':id/atribuir-fornecedor')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Atribuir fornecedor e gerar submissão de pedido' })
  atribuirFornecedor(
    @Param('id', ParseIntPipe) listaId: number,
    @Body() dto: AtribuirFornecedorDto,
    @TenantId() restauranteId: number,
    @CurrentUser('id') usuarioId: number,
  ) {
    return this.listasService.atribuirFornecedor(
      listaId,
      dto.itemRefIds,
      dto.fornecedorId,
      restauranteId,
      usuarioId,
    );
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
