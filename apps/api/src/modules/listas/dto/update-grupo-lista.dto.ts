import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateGrupoListaDto {
  @ApiProperty({ example: 'Grupo Matriz - Turno Noite' })
  @IsString()
  @IsNotEmpty()
  nomeGrupo: string;
}
