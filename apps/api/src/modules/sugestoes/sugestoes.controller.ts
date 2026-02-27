import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StatusSugestao } from '@prisma/client';
import { CurrentUser, Roles, TenantId } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';
import { CreateSugestaoDto } from './dto/create-sugestao.dto';
import { RejeitarSugestaoDto } from './dto/rejeitar-sugestao.dto';
import { SugestoesService } from './sugestoes.service';

// ─── Colaborador Controller ──────────────────────────────────────────────────

@ApiTags('Colaborador — Sugestões')
@Controller('v1/collaborator/sugestoes')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
@Roles('COLLABORATOR' as any, 'ADMIN' as any, 'SUPER_ADMIN' as any)
@ApiBearerAuth()
export class CollaboratorSugestoesController {
  constructor(private readonly service: SugestoesService) {}

  @Post()
  @ApiOperation({ summary: 'Criar sugestão de item' })
  create(
    @TenantId() restauranteId: number,
    @CurrentUser() user: any,
    @Body() dto: CreateSugestaoDto,
  ) {
    return this.service.create(restauranteId, user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar minhas sugestões' })
  findAll(
    @TenantId() restauranteId: number,
    @CurrentUser() user: any,
  ) {
    return this.service.findAllByColaborador(user.sub, restauranteId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de uma sugestão' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.service.findOne(id, restauranteId);
  }
}

// ─── Admin Controller ────────────────────────────────────────────────────────

@ApiTags('Admin — Sugestões')
@Controller('v1/admin/sugestoes')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
@Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
@ApiBearerAuth()
export class AdminSugestoesController {
  constructor(private readonly service: SugestoesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar sugestões do restaurante' })
  findAll(
    @TenantId() restauranteId: number,
    @Query('status', new ParseEnumPipe(StatusSugestao, { optional: true }))
    status?: StatusSugestao,
  ) {
    return this.service.findAllAdmin(restauranteId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de uma sugestão' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.service.findOne(id, restauranteId);
  }

  @Put(':id/aprovar')
  @ApiOperation({ summary: 'Aprovar sugestão e criar item no catálogo' })
  aprovar(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.service.aprovar(id, restauranteId);
  }

  @Put(':id/rejeitar')
  @ApiOperation({ summary: 'Rejeitar sugestão' })
  rejeitar(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
    @Body() dto: RejeitarSugestaoDto,
  ) {
    return this.service.rejeitar(id, restauranteId);
  }
}
