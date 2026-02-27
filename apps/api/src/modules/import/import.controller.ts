import {
  Controller,
  Post,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { RolesGuard, TenantGuard } from '../../common/guards';
import { Roles, TenantId } from '../../common/decorators';
import { ImportService } from './import.service';

@ApiTags('Import')
@Controller('v1/admin/import')
@UseGuards(AuthGuard('jwt'), RolesGuard, TenantGuard)
@ApiBearerAuth()
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Get('listas')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Lista listas disponíveis para importar itens (fase 2)' })
  listarListas(@TenantId() restauranteId: number) {
    return this.importService.listarListas(restauranteId);
  }

  @Post('backup-zip')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Importar backup ZIP do legado (fase 1)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
      fileFilter: (_req, file, cb) => {
        if (!file.originalname.toLowerCase().endsWith('.zip')) {
          return cb(new BadRequestException('Apenas arquivos .zip são aceitos'), false);
        }
        cb(null, true);
      },
    }),
  )
  async importarZip(
    @UploadedFile() file: Express.Multer.File,
    @TenantId() restauranteId: number,
  ) {
    if (!file) throw new BadRequestException('Arquivo ZIP não enviado');
    return this.importService.importarZipBackup(file.buffer, restauranteId);
  }

  @Post('lista-csv/:listaId')
  @Roles('ADMIN' as any, 'SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Importar itens de uma lista via CSV do legado (fase 2)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (_req, file, cb) => {
        if (!file.originalname.toLowerCase().endsWith('.csv')) {
          return cb(new BadRequestException('Apenas arquivos .csv são aceitos'), false);
        }
        cb(null, true);
      },
    }),
  )
  async importarListaCsv(
    @UploadedFile() file: Express.Multer.File,
    @Param('listaId', ParseIntPipe) listaId: number,
    @TenantId() restauranteId: number,
  ) {
    if (!file) throw new BadRequestException('Arquivo CSV não enviado');
    return this.importService.importarListaCsv(file.buffer, listaId, restauranteId);
  }
}
