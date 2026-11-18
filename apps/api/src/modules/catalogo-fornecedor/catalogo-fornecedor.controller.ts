import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles, TenantId } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';
import { CatalogoFornecedorService } from './catalogo-fornecedor.service';
import {
  ConfirmarCatalogoDto, CreateCatalogoItemDto, ListarCatalogoQueryDto, PreviewCatalogoDto, UpdateCatalogoItemDto,
} from './dto/catalogo.dto';

@ApiTags('Catálogo do fornecedor')
@Controller('v1/admin/fornecedores/:fornecedorId/itens')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
@ApiBearerAuth()
export class CatalogoFornecedorController {
  constructor(private readonly service: CatalogoFornecedorService) {}

  @Get()
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Listar/buscar itens do fornecedor (q, ativo)' })
  listar(@Param('fornecedorId', ParseIntPipe) fornecedorId: number, @TenantId() rid: number, @Query() q: ListarCatalogoQueryDto) {
    return this.service.listar(fornecedorId, rid, { q: q.q, ativo: q.ativo });
  }

  @Post()
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Criar item do fornecedor' })
  criar(@Param('fornecedorId', ParseIntPipe) fornecedorId: number, @TenantId() rid: number, @Body() dto: CreateCatalogoItemDto) {
    return this.service.criar(fornecedorId, dto, rid);
  }

  @Post('importacao/preview')
  @HttpCode(200)
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Pré-visualizar importação CSV/texto (não grava itens)' })
  preview(
    @Param('fornecedorId', ParseIntPipe) fornecedorId: number, @TenantId() rid: number,
    @CurrentUser('id') usuarioId: number, @Body() dto: PreviewCatalogoDto,
  ) {
    return this.service.preview(fornecedorId, dto, rid, usuarioId);
  }

  @Post('importacao/confirmar')
  @HttpCode(200)
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Confirmar importação (idempotente por token)' })
  confirmar(@Param('fornecedorId', ParseIntPipe) fornecedorId: number, @TenantId() rid: number, @Body() dto: ConfirmarCatalogoDto) {
    return this.service.confirmar(fornecedorId, dto.token, rid);
  }

  @Put(':id')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Atualizar item do fornecedor' })
  atualizar(
    @Param('fornecedorId', ParseIntPipe) fornecedorId: number, @Param('id', ParseIntPipe) id: number,
    @TenantId() rid: number, @Body() dto: UpdateCatalogoItemDto,
  ) {
    return this.service.atualizar(fornecedorId, id, dto, rid);
  }

  @Delete(':id')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Inativar item (exclusão lógica)' })
  inativar(@Param('fornecedorId', ParseIntPipe) fornecedorId: number, @Param('id', ParseIntPipe) id: number, @TenantId() rid: number) {
    return this.service.inativar(fornecedorId, id, rid);
  }
}
