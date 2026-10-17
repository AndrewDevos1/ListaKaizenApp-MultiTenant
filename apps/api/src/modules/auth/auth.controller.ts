import { Controller, Post, Get, Put, Delete, Body, UseGuards, Query, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { SaveNavbarLayoutDto } from './dto/save-navbar-layout.dto';
import { SaveNavbarStyleDto } from './dto/save-navbar-style.dto';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';
import { UpdateSessionTimeoutDto } from './dto/update-session-timeout.dto';

@ApiTags('Auth')
@Controller('v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar novo usuário' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('session-timeout')
  @UseGuards(AuthGuard('jwt'), TenantGuard)
  @ApiBearerAuth()
  getSessionTimeout(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') role: UserRole,
    @Query('restauranteId') restauranteId?: string,
  ) {
    const target = restauranteId === undefined ? undefined : Number(restauranteId);
    if (restauranteId !== undefined && (target === undefined || !Number.isInteger(target) || target < 1)) throw new BadRequestException('restauranteId inválido');
    if (target !== undefined && role !== UserRole.SUPER_ADMIN) throw new BadRequestException('Somente SUPER_ADMIN pode selecionar restaurante');
    return this.authService.getSessionTimeout(userId, target);
  }

  @Put('session-timeout')
  @UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
  @Roles(UserRole.COLLABORATOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  updateSessionTimeout(
    @CurrentUser('id') userId: number,
    @CurrentUser('role') role: UserRole,
    @Body() dto: UpdateSessionTimeoutDto,
  ) {
    return this.authService.updateSessionTimeout(userId, role, dto);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Perfil do usuário logado' })
  getProfile(@CurrentUser('id') userId: number) {
    return this.authService.getProfile(userId);
  }

  @Put('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar perfil do usuário logado' })
  updateProfile(
    @CurrentUser('id') userId: number,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(userId, dto);
  }

  @Put('avatar')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar avatar do usuário' })
  updateAvatar(
    @CurrentUser('id') usuarioId: number,
    @Body() body: { avatarBase64: string },
  ) {
    return this.authService.updateAvatar(usuarioId, body.avatarBase64);
  }

  @Delete('avatar')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remover avatar do usuário' })
  removeAvatar(@CurrentUser('id') usuarioId: number) {
    return this.authService.removeAvatar(usuarioId);
  }

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trocar senha' })
  changePassword(
    @CurrentUser('id') userId: number,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto);
  }

  @Get('navbar-layout')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buscar layout do navbar por role' })
  getNavbarLayout() {
    return this.authService.getNavbarLayouts();
  }

  @Post('navbar-layout')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Salvar layout do navbar para uma role' })
  saveNavbarLayout(
    @CurrentUser('role') currentRole: UserRole,
    @Body() dto: SaveNavbarLayoutDto,
  ) {
    return this.authService.saveNavbarLayout(currentRole, dto);
  }

  @Get('navbar-style')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buscar estilo da navbar do usuário logado' })
  getNavbarStyle(@CurrentUser('id') userId: number) {
    return this.authService.getNavbarStyle(userId);
  }

  @Put('navbar-style')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Salvar estilo da navbar do usuário logado' })
  saveNavbarStyle(
    @CurrentUser('id') userId: number,
    @Body() dto: SaveNavbarStyleDto,
  ) {
    return this.authService.saveNavbarStyle(userId, dto);
  }
}
