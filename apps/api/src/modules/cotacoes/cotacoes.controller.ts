import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CotacoesService } from './cotacoes.service';
import { CreateCotacaoDto } from './dto/create-cotacao.dto';
import { UpdateCotacaoItemDto } from './dto/update-cotacao-item.dto';
import { Roles, TenantId } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';

@ApiTags('Admin — Cotações')
@Controller('v1/admin')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
@ApiBearerAuth()
export class CotacoesController {
  constructor(private cotacoesService: CotacoesService) {}

  @Get('cotacoes')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Listar cotações do restaurante' })
  findAll(@TenantId() restauranteId: number) {
    return this.cotacoesService.findAll(restauranteId);
  }

  @Get('cotacoes/:id')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Detalhe de uma cotação com itens' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.cotacoesService.findOne(id, restauranteId);
  }

  @Post('cotacoes')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Criar cotação (opcionalmente a partir de submissões)' })
  create(
    @TenantId() restauranteId: number,
    @Body() dto: CreateCotacaoDto,
  ) {
    return this.cotacoesService.create(restauranteId, dto);
  }

  @Put('cotacao-itens/:id')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Registrar preço unitário em um item de cotação' })
  updateCotacaoItem(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
    @Body() dto: UpdateCotacaoItemDto,
  ) {
    return this.cotacoesService.updateCotacaoItem(id, dto, restauranteId);
  }

  @Put('cotacoes/:id/fechar')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Fechar cotação' })
  fechar(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.cotacoesService.fechar(id, restauranteId);
  }
}
