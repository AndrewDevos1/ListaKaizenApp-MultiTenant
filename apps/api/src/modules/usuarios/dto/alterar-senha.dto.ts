import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AlterarSenhaDto {
  @ApiProperty()
  @IsString()
  @MinLength(6)
  novaSenha: string;
}
