import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class SaveNavbarStyleDto {
  @ApiProperty({ enum: ['current', 'next'], example: 'current' })
  @IsIn(['current', 'next'])
  style!: 'current' | 'next';
}
