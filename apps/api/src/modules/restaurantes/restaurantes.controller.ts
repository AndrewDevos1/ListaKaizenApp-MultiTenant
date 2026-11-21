import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RestaurantesService } from './restaurantes.service';
import { CreateRestauranteDto } from './dto/create-restaurante.dto';
import { UpdateRestauranteDto } from './dto/update-restaurante.dto';
import { UpdateRestauranteModulosDto } from './dto/update-restaurante-modulos.dto';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@ApiTags('Restaurantes')
@Controller('restaurantes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class RestaurantesController {
  constructor(private restaurantesService: RestaurantesService) {}

  @Post()
  @Roles('SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Criar restaurante (SUPER_ADMIN)' })
  create(@Body() dto: CreateRestauranteDto) {
    return this.restaurantesService.create(dto);
  }

  @Get()
  @Roles('SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Listar restaurantes (SUPER_ADMIN)' })
  findAll() {
    return this.restaurantesService.findAll();
  }

  @Get('stats/global')
  @Roles('SUPER_ADMIN' as any, 'ADMIN' as any)
  @ApiOperation({ summary: 'Stats globais (ADMIN e SUPER_ADMIN)' })
  async getGlobalStats(
    @CurrentUser('role') role: string,
    @CurrentUser('restauranteId') currentRestauranteId: number | null,
    @Query('restauranteId') restauranteIdQuery?: string,
    @Query('period') periodQuery?: string,
  ) {
    const period = periodQuery ? Number.parseInt(periodQuery, 10) : undefined;
    if (periodQuery && Number.isNaN(period)) {
      throw new BadRequestException('Parâmetro period inválido');
    }

    if (role === 'SUPER_ADMIN') {
      const restauranteId = restauranteIdQuery
        ? Number.parseInt(restauranteIdQuery, 10)
        : undefined;
      if (restauranteIdQuery && Number.isNaN(restauranteId)) {
        throw new BadRequestException('Parâmetro restauranteId inválido');
      }
      return this.restaurantesService.getGlobalStats({
        restauranteId,
        period,
      });
    }

    return this.restaurantesService.getGlobalStats({
      restauranteId: currentRestauranteId ?? undefined,
      period,
    });
  }

  @Get(':id/usuarios')
  @Roles('SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Listar usuários de um restaurante (SUPER_ADMIN)' })
  listarUsuarios(@Param('id', ParseIntPipe) id: number) {
    return this.restaurantesService.listarUsuarios(id);
  }

  @Put('usuarios/:id/alterar-senha')
  @Roles('SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Alterar senha de usuário do restaurante (SUPER_ADMIN)' })
  alterarSenhaUsuario(
    @Param('id', ParseIntPipe) usuarioId: number,
    @Body('restauranteId') restauranteIdRaw: string | number,
    @Body('novaSenha') novaSenha?: string,
  ) {
    const restauranteId = Number(restauranteIdRaw);
    if (!restauranteId || Number.isNaN(restauranteId)) {
      throw new BadRequestException('restauranteId inválido');
    }
    if (!novaSenha || novaSenha.trim().length < 6) {
      throw new BadRequestException('novaSenha deve ter no mínimo 6 caracteres');
    }
    return this.restaurantesService.alterarSenhaUsuario(
      restauranteId,
      usuarioId,
      novaSenha.trim(),
    );
  }

  @Post('usuarios/:id/resetar-senha')
  @Roles('SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Resetar senha de usuário do restaurante (SUPER_ADMIN)' })
  resetarSenhaUsuario(
    @Param('id', ParseIntPipe) usuarioId: number,
    @Body('restauranteId') restauranteIdRaw: string | number,
  ) {
    const restauranteId = Number(restauranteIdRaw);
    if (!restauranteId || Number.isNaN(restauranteId)) {
      throw new BadRequestException('restauranteId inválido');
    }
    return this.restaurantesService.resetarSenhaUsuario(restauranteId, usuarioId);
  }

  @Put(':id/modulos')
  @Roles('SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Configurar módulos do restaurante (SUPER_ADMIN)' })
  updateModulos(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRestauranteModulosDto,
    @CurrentUser('id') actorId: number,
  ) {
    return this.restaurantesService.updateModulos(id, dto, actorId);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Detalhes de restaurante (SUPER_ADMIN)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.restaurantesService.findOne(id);
  }

  @Put(':id')
  @Roles('SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Atualizar restaurante (SUPER_ADMIN)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRestauranteDto,
  ) {
    return this.restaurantesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Desativar restaurante (SUPER_ADMIN)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.restaurantesService.remove(id);
  }
}
