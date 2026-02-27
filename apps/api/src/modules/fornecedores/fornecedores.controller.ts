import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { FornecedoresService } from './fornecedores.service';
import { CreateFornecedorDto } from './dto/create-fornecedor.dto';
import { UpdateFornecedorDto } from './dto/update-fornecedor.dto';
import { Roles, TenantId } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';

@ApiTags('Fornecedores')
@Controller('v1/admin/fornecedores')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
@ApiBearerAuth()
export class FornecedoresController {
  constructor(private fornecedoresService: FornecedoresService) {}

  @Get()
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Listar fornecedores do restaurante' })
  @ApiQuery({ name: 'ativo', required: false, enum: ['true', 'false'] })
  findAll(
    @TenantId() restauranteId: number,
    @Query('ativo') ativo?: string,
  ) {
    const ativoBool =
      ativo === 'true' ? true : ativo === 'false' ? false : undefined;
    return this.fornecedoresService.findAll(restauranteId, ativoBool);
  }

  @Get('exportar-csv')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Exportar fornecedores em CSV' })
  async exportarCsv(
    @TenantId() restauranteId: number,
    @Res() res: Response,
  ) {
    const csv = await this.fornecedoresService.exportarCsv(restauranteId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=fornecedores.csv');
    res.send(csv);
  }

  @Get(':id')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Detalhes do fornecedor' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.fornecedoresService.findOne(id, restauranteId);
  }

  @Post()
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Criar fornecedor' })
  create(
    @Body() dto: CreateFornecedorDto,
    @TenantId() restauranteId: number,
  ) {
    return this.fornecedoresService.create(dto, restauranteId);
  }

  @Put(':id')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Atualizar fornecedor' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFornecedorDto,
    @TenantId() restauranteId: number,
  ) {
    return this.fornecedoresService.update(id, dto, restauranteId);
  }

  @Delete(':id')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Desativar fornecedor (soft delete)' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.fornecedoresService.remove(id, restauranteId);
  }
}
