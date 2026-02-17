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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { Roles, TenantId } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';

@ApiTags('Items')
@Controller('v1/items')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
@ApiBearerAuth()
export class ItemsController {
  constructor(private itemsService: ItemsService) {}

  @Post()
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Criar item' })
  create(@Body() dto: CreateItemDto, @TenantId() restauranteId: number) {
    return this.itemsService.create(dto, restauranteId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar itens do restaurante' })
  findAll(@TenantId() restauranteId: number) {
    return this.itemsService.findAll(restauranteId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Buscar itens' })
  search(@Query('q') query: string, @TenantId() restauranteId: number) {
    return this.itemsService.search(query || '', restauranteId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhes do item' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.itemsService.findOne(id, restauranteId);
  }

  @Put(':id')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Atualizar item' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateItemDto,
    @TenantId() restauranteId: number,
  ) {
    return this.itemsService.update(id, dto, restauranteId);
  }

  @Delete(':id')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Desativar item' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.itemsService.remove(id, restauranteId);
  }
}
