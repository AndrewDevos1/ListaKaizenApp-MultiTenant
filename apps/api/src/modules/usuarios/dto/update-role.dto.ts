import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class UpdateRoleDto {
  @ApiProperty({ enum: UserRole, example: UserRole.COLLABORATOR })
  @IsEnum(UserRole)
  role: UserRole;
}
