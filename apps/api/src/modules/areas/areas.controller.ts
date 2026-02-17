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
import { Roles, TenantId } from '../../common/decorators';
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
