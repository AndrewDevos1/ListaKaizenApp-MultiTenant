import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  senhaAtual: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6)
  novaSenha: string;
}
