import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Modulo, Roles, TenantId } from '../../common/decorators';
import { ModuloGuard, RolesGuard, TenantGuard } from '../../common/guards';
import { AlmoxarifadoService } from './almoxarifado.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { CreatePosicaoDto } from './dto/create-posicao.dto';
import { CreateVarianteDto } from './dto/create-variante.dto';
import { MovimentarDto } from './dto/movimentar.dto';
import { UpdatePosicaoDto } from './dto/update-posicao.dto';
import { SuperAdminTenantGuard } from './super-admin-tenant.guard';

@ApiTags('Almoxarifado EPI')
@ApiBearerAuth()
@Controller('v1/admin/almoxarifado')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard, SuperAdminTenantGuard, ModuloGuard)
@Modulo('moduloAlmoxarifadoEpi')
@Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
export class AlmoxarifadoController {
  constructor(private service: AlmoxarifadoService) {}
  @Get('materiais') listMateriais(@TenantId() r: number) { return this.service.listMateriais(r); }
  @Post('materiais') createMaterial(@Body() d: CreateMaterialDto, @TenantId() r: number) { return this.service.createMaterial(d, r); }
  @Post('variantes') createVariante(@Body() d: CreateVarianteDto, @TenantId() r: number) { return this.service.createVariante(d, r); }
  @Get() list(@TenantId() r: number, @Query('busca') b?: string, @Query('ativo') a?: string) { return this.service.list(r, b, a === undefined ? undefined : a === 'true'); }
  @Post() create(@Body() d: CreatePosicaoDto, @TenantId() r: number) { return this.service.create(d, r); }
  @Get(':id') one(@Param('id', ParseIntPipe) id: number, @TenantId() r: number) { return this.service.one(id, r); }
  @Put(':id') update(@Param('id', ParseIntPipe) id: number, @Body() d: UpdatePosicaoDto, @TenantId() r: number) { return this.service.update(id, d, r); }
  @Post(':id/movimentacoes') move(@Param('id', ParseIntPipe) id: number, @Body() d: MovimentarDto, @TenantId() r: number, @CurrentUser() u: any) { return this.service.move(id, d, r, u); }
}
