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
import { UsuariosService } from './usuarios.service';
import { FilterUsuariosDto } from './dto/filter-usuarios.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { CriarUsuarioDto } from './dto/criar-usuario.dto';
import { AlterarSenhaDto } from './dto/alterar-senha.dto';
import { Roles, TenantId } from '../../common/decorators';
import { RolesGuard, TenantGuard } from '../../common/guards';

@ApiTags('Admin — Usuarios')
@Controller('v1/admin/usuarios')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
@ApiBearerAuth()
export class UsuariosController {
  constructor(private usuariosService: UsuariosService) {}

  @Get()
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Listar usuários do restaurante' })
  findAll(
    @TenantId() restauranteId: number,
    @Query() filter: FilterUsuariosDto,
  ) {
    return this.usuariosService.findAll(restauranteId, filter);
  }

  @Put(':id/aprovar')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Aprovar usuário' })
  aprovar(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.usuariosService.aprovar(id, restauranteId);
  }

  @Put(':id/desativar')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Desativar usuário' })
  desativar(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.usuariosService.desativar(id, restauranteId);
  }

  @Put(':id/role')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Atualizar role do usuário' })
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.usuariosService.updateRole(id, restauranteId, dto);
  }

  @Put(':id')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Editar dados do usuário' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
    @Body() dto: UpdateUsuarioDto,
  ) {
    return this.usuariosService.update(id, restauranteId, dto);
  }

  @Post()
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Criar usuário diretamente' })
  criar(
    @TenantId() restauranteId: number,
    @Body() dto: CriarUsuarioDto,
  ) {
    return this.usuariosService.criar(restauranteId, dto);
  }

  @Put(':id/alterar-senha')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Alterar senha de um usuário' })
  alterarSenha(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
    @Body() dto: AlterarSenhaDto,
  ) {
    return this.usuariosService.alterarSenha(id, restauranteId, dto);
  }

  @Post(':id/resetar-senha')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Resetar senha (gera aleatória)' })
  resetarSenha(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.usuariosService.resetarSenha(id, restauranteId);
  }

  @Delete(':id')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Deletar usuário permanentemente' })
  deletar(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() restauranteId: number,
  ) {
    return this.usuariosService.deletar(id, restauranteId);
  }
}
