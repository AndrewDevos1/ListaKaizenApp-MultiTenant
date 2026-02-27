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
import { RestaurantesService } from './restaurantes.service';
import { CreateRestauranteDto } from './dto/create-restaurante.dto';
import { UpdateRestauranteDto } from './dto/update-restaurante.dto';
import { Roles } from '../../common/decorators';
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
  @Roles('SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Stats globais (SUPER_ADMIN)' })
  async getGlobalStats() {
    return this.restaurantesService.getGlobalStats();
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
