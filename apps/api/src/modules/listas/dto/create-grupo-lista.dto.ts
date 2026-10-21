import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateGrupoListaDto {
  @ApiProperty({ example: 'Operação Cozinha + Bar' })
  @IsString()
  @IsNotEmpty()
  nomeGrupo: string;

  @ApiPropertyOptional({ type: [Number], example: [1, 2, 3] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  listaIds?: number[];
}
