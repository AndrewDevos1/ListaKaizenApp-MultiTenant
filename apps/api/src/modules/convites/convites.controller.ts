import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConvitesService } from './convites.service';
import { CreateConviteDto } from './dto/create-convite.dto';
import { Roles, TenantId } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';

// ─── Admin Controller ────────────────────────────────────────────────────────

@ApiTags('Admin — Convites')
@Controller('v1/admin/convites')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
@ApiBearerAuth()
export class AdminConvitesController {
  constructor(private readonly convitesService: ConvitesService) {}

  @Post()
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Gerar novo convite' })
  gerarConvite(
    @TenantId() restauranteId: number,
    @Body() dto: CreateConviteDto,
  ) {
    return this.convitesService.gerarConvite(restauranteId, dto);
  }

  @Get()
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Listar convites do restaurante' })
  findAll(@TenantId() restauranteId: number) {
    return this.convitesService.findAll(restauranteId);
  }

  @Put(':id/revogar')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Revogar convite' })
  revogar(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.convitesService.revogar(id, restauranteId);
  }
}

// ─── Public Controller ───────────────────────────────────────────────────────

@ApiTags('Convites — Público')
@Controller('v1/convites')
export class PublicConvitesController {
  constructor(private readonly convitesService: ConvitesService) {}

  @Get('validar')
  @ApiOperation({ summary: 'Validar token de convite (público)' })
  validar(@Query('token') token: string) {
    return this.convitesService.validar(token);
  }
}
