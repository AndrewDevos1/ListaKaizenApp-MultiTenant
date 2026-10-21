import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles, TenantId } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';
import { CreatePOPTemplateDto } from './dto/create-pop-template.dto';
import { UpdatePOPTemplateDto } from './dto/update-pop-template.dto';
import { AddPassoDto } from './dto/add-passo.dto';
import { IniciarExecucaoDto } from './dto/iniciar-execucao.dto';
import { MarcarPassoDto } from './dto/marcar-passo.dto';
import { POPService } from './pop.service';

// ─── Admin Controller ────────────────────────────────────────────────────────

@ApiTags('Admin — POP')
@Controller('v1/admin/pop')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
@Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
@ApiBearerAuth()
export class AdminPOPController {
  constructor(private readonly service: POPService) {}

  @Get('templates')
  @ApiOperation({ summary: 'Listar templates POP ativos' })
  findAllTemplates(@TenantId() restauranteId: number) {
    return this.service.findAllTemplates(restauranteId);
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Detalhe de um template POP' })
  findOneTemplate(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.service.findOneTemplate(id, restauranteId);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Criar template POP com passos' })
  createTemplate(
    @TenantId() restauranteId: number,
    @Body() dto: CreatePOPTemplateDto,
  ) {
    return this.service.createTemplate(restauranteId, dto);
  }

  @Put('templates/:id')
  @ApiOperation({ summary: 'Atualizar template POP' })
  updateTemplate(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
    @Body() dto: UpdatePOPTemplateDto,
  ) {
    return this.service.updateTemplate(id, restauranteId, dto);
  }

  @Post('templates/:id/passos')
  @ApiOperation({ summary: 'Adicionar passo ao template POP' })
  addPasso(
    @Param('id', ParseIntPipe) templateId: number,
    @TenantId() restauranteId: number,
    @Body() dto: AddPassoDto,
  ) {
    return this.service.addPasso(templateId, restauranteId, dto);
  }

  @Delete('passos/:passoId')
  @ApiOperation({ summary: 'Remover passo do template POP' })
  deletePasso(
    @Param('passoId', ParseIntPipe) passoId: number,
    @TenantId() restauranteId: number,
  ) {
    return this.service.deletePasso(passoId, restauranteId);
  }

  @Get('execucoes')
  @ApiOperation({ summary: 'Listar todas as execuções POP do restaurante' })
  findAllExecucoes(@TenantId() restauranteId: number) {
    return this.service.findAllExecucoesAdmin(restauranteId);
  }
}

// ─── Colaborador Controller ──────────────────────────────────────────────────

@ApiTags('Colaborador — POP')
@Controller('v1/collaborator/pop')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
@Roles('COLLABORATOR' as any, 'ADMIN' as any, 'SUPER_ADMIN' as any)
@ApiBearerAuth()
export class CollaboratorPOPController {
  constructor(private readonly service: POPService) {}

  @Get('templates')
  @ApiOperation({ summary: 'Listar templates POP disponíveis' })
  findAllTemplates(@TenantId() restauranteId: number) {
    return this.service.findAllTemplates(restauranteId);
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Detalhe de um template POP' })
  findOneTemplate(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.service.findOneTemplate(id, restauranteId);
  }

  @Post('execucoes')
  @ApiOperation({ summary: 'Iniciar execução de um template POP' })
  iniciarExecucao(
    @TenantId() restauranteId: number,
    @CurrentUser('id') userId: number,
    @Body() dto: IniciarExecucaoDto,
  ) {
    return this.service.iniciarExecucao(userId, restauranteId, dto);
  }

  @Get('execucoes')
  @ApiOperation({ summary: 'Listar minhas execuções POP' })
  findAllExecucoes(
    @TenantId() restauranteId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.service.findAllExecucoesColaborador(userId, restauranteId);
  }

  @Get('execucoes/:id')
  @ApiOperation({ summary: 'Detalhe de uma execução POP com itens' })
  findOneExecucao(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.service.findOneExecucao(id, restauranteId);
  }

  @Put('execucoes/:id/passos/:passoId/marcar')
  @ApiOperation({ summary: 'Marcar/desmarcar passo de uma execução' })
  marcarPasso(
    @Param('id', ParseIntPipe) execucaoId: number,
    @Param('passoId', ParseIntPipe) passoId: number,
    @TenantId() restauranteId: number,
    @Body() dto: MarcarPassoDto,
  ) {
    return this.service.marcarPasso(execucaoId, passoId, restauranteId, dto);
  }

  @Put('execucoes/:id/concluir')
  @ApiOperation({ summary: 'Concluir execução POP' })
  concluirExecucao(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.service.concluirExecucao(id, userId, restauranteId);
  }

  @Put('execucoes/:id/cancelar')
  @ApiOperation({ summary: 'Cancelar execução POP' })
  cancelarExecucao(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
    @CurrentUser('id') userId: number,
  ) {
    return this.service.cancelarExecucao(id, userId, restauranteId);
  }
}
