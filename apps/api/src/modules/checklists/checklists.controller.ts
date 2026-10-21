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
import { ChecklistsService } from './checklists.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { Roles, TenantId } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';

@ApiTags('Admin — Checklists')
@Controller('v1/admin')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
@ApiBearerAuth()
export class ChecklistsController {
  constructor(private checklistsService: ChecklistsService) {}

  @Get('checklists')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Listar checklists do restaurante' })
  findAll(@TenantId() restauranteId: number) {
    return this.checklistsService.findAll(restauranteId);
  }

  @Get('checklists/:id')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Detalhe de um checklist com itens' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.checklistsService.findOne(id, restauranteId);
  }

  @Post('checklists')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Criar checklist a partir de uma submissão aprovada' })
  create(
    @TenantId() restauranteId: number,
    @Body() dto: CreateChecklistDto,
  ) {
    return this.checklistsService.create(dto, restauranteId);
  }

  @Put('checklist-itens/:id/marcar')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Marcar/desmarcar item do checklist (toggle)' })
  marcarItem(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.checklistsService.marcarItem(id, restauranteId);
  }

  @Put('checklists/:id/finalizar')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Finalizar checklist' })
  finalizar(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.checklistsService.finalizar(id, restauranteId);
  }

  @Put('checklists/:id/reabrir')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Reabrir checklist finalizado' })
  reabrir(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.checklistsService.reabrir(id, restauranteId);
  }
}
