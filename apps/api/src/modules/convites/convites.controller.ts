import {
  BadRequestException,
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
import { CurrentUser, Roles, TenantId } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';

// ─── Admin Controller ────────────────────────────────────────────────────────

@ApiTags('Admin — Convites')
@Controller('v1/admin/convites')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
@ApiBearerAuth()
export class AdminConvitesController {
  constructor(private readonly convitesService: ConvitesService) {}

  private resolverRestauranteId(
    role: string,
    tenantId: number | null,
    restauranteIdQuery?: string,
  ): number {
    if (role === 'SUPER_ADMIN') {
      const restauranteId = restauranteIdQuery
        ? Number.parseInt(restauranteIdQuery, 10)
        : undefined;
      if (!restauranteId || Number.isNaN(restauranteId)) {
        throw new BadRequestException(
          'SUPER_ADMIN deve informar restauranteId na query',
        );
      }
      return restauranteId;
    }

    if (!tenantId) {
      throw new BadRequestException('restauranteId não encontrado');
    }

    return tenantId;
  }

  @Post()
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Gerar novo convite' })
  gerarConvite(
    @CurrentUser('role') role: string,
    @TenantId() tenantId: number | null,
    @Body() dto: CreateConviteDto,
    @Query('restauranteId') restauranteIdQuery?: string,
  ) {
    const restauranteId = this.resolverRestauranteId(
      role,
      tenantId,
      restauranteIdQuery,
    );
    return this.convitesService.gerarConvite(restauranteId, dto);
  }

  @Get()
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Listar convites do restaurante' })
  findAll(
    @CurrentUser('role') role: string,
    @TenantId() tenantId: number | null,
    @Query('restauranteId') restauranteIdQuery?: string,
  ) {
    const restauranteId = this.resolverRestauranteId(
      role,
      tenantId,
      restauranteIdQuery,
    );
    return this.convitesService.findAll(restauranteId);
  }

  @Put(':id/revogar')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Revogar convite' })
  revogar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('role') role: string,
    @TenantId() tenantId: number | null,
    @Query('restauranteId') restauranteIdQuery?: string,
  ) {
    const restauranteId = this.resolverRestauranteId(
      role,
      tenantId,
      restauranteIdQuery,
    );
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
