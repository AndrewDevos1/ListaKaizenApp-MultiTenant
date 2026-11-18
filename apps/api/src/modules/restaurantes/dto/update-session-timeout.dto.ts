import { IsInt, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSessionTimeoutDto {
  @ApiProperty({ minimum: 5, maximum: 480, example: 30 })
  @IsInt()
  @Min(5)
  @Max(480)
  sessionTimeoutMinutos: number;
}
