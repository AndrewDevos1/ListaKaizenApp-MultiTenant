import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export class SaveNavbarLayoutDto {
  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ type: [String], default: [] })
  @IsArray()
  @IsString({ each: true })
  hiddenGroupIds!: string[];

  @ApiProperty({ type: [String], default: [] })
  @IsArray()
  @IsString({ each: true })
  hiddenItemKeys!: string[];
}
