import { Body, Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PushService } from './push.service';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@ApiTags('Push')
@Controller('v1/push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('vapid-public-key')
  @ApiOperation({ summary: 'Obter chave pública VAPID' })
  getVapidPublicKey() {
    return this.pushService.getVapidPublicKey();
  }

  @Post('subscribe')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('COLLABORATOR' as any, 'ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registrar assinatura push' })
  subscribe(
    @CurrentUser('id') usuarioId: number,
    @Body() body: { endpoint: string; keys: { p256dh: string; auth: string } },
  ) {
    return this.pushService.subscribe(usuarioId, body);
  }

  @Delete('subscribe')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('COLLABORATOR' as any, 'ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remover assinatura push' })
  unsubscribe(
    @CurrentUser('id') usuarioId: number,
    @Body() body: { endpoint: string },
  ) {
    return this.pushService.unsubscribe(usuarioId, body.endpoint);
  }
}
