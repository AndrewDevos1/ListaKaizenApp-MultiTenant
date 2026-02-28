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
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RestaurantesService } from './restaurantes.service';
import { CreateRestauranteDto } from './dto/create-restaurante.dto';
import { UpdateRestauranteDto } from './dto/update-restaurante.dto';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@ApiTags('Restaurantes')
@Controller('restaurantes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class RestaurantesController {
  constructor(private restaurantesService: RestaurantesService) {}

  @Post()
  @Roles('SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Criar restaurante (SUPER_ADMIN)' })
  create(@Body() dto: CreateRestauranteDto) {
    return this.restaurantesService.create(dto);
  }

  @Get()
  @Roles('SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Listar restaurantes (SUPER_ADMIN)' })
  findAll() {
    return this.restaurantesService.findAll();
  }

  @Get('stats/global')
  @Roles('SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Stats globais (SUPER_ADMIN)' })
  async getGlobalStats() {
    return this.restaurantesService.getGlobalStats();
  }

  @Post('restore')
  @Roles('SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Restaurar backup .kaizen (SUPER_ADMIN)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('arquivo', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.originalname.toLowerCase().endsWith('.kaizen')) {
          return cb(new BadRequestException('Apenas arquivos .kaizen são aceitos'), false);
        }
        cb(null, true);
      },
    }),
  )
  async restore(
    @UploadedFile() file: Express.Multer.File,
    @Body('restauranteId') restauranteIdStr?: string,
  ) {
    if (!file) throw new BadRequestException('Arquivo .kaizen não enviado');
    const restauranteId = restauranteIdStr ? parseInt(restauranteIdStr, 10) : undefined;
    return this.restaurantesService.restoreRestaurante(file.buffer, restauranteId);
  }

  @Get(':id/backup')
  @Roles('SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Exportar backup .kaizen do restaurante (SUPER_ADMIN)' })
  async backup(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename } = await this.restaurantesService.backupRestaurante(id);
    res.set({
      'Content-Type': 'application/gzip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return new StreamableFile(buffer);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Detalhes de restaurante (SUPER_ADMIN)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.restaurantesService.findOne(id);
  }

  @Put(':id')
  @Roles('SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Atualizar restaurante (SUPER_ADMIN)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRestauranteDto,
  ) {
    return this.restaurantesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN' as any)
  @ApiOperation({ summary: 'Desativar restaurante (SUPER_ADMIN)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.restaurantesService.remove(id);
  }
}
