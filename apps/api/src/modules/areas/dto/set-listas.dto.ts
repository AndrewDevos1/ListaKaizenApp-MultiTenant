import { IsArray, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetListasDto {
  @ApiProperty({ type: [Number], example: [1, 2] })
  @IsArray()
  @IsInt({ each: true })
  listaIds: number[];
}
