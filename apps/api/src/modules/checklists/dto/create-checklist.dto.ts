import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateChecklistDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  submissaoId: number;
}
