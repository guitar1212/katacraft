import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Role } from '@katacraft/shared';
import { AdminUsersService } from './admin-users.service';
import { CreditsService } from '../users/credits.service';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types';
import { UpdateUserDto, AdjustCreditsDto } from './dto/admin.dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminUsersController {
  constructor(
    private adminUsers: AdminUsersService,
    private credits: CreditsService,
    private audit: AuditService,
  ) {}

  @Get()
  list(
    @Query('q') q?: string,
    @Query('role') role?: 'MEMBER' | 'DESIGNER' | 'ADMIN',
    @Query('status') status?: 'ACTIVE' | 'SUSPENDED',
    @Query('page') page?: string,
  ) {
    return this.adminUsers.list({ q, role, status, page: page ? Number(page) : undefined });
  }

  @Patch(':id')
  async update(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    const user = await this.adminUsers.updateRoleStatus(id, dto);
    await this.audit.log(actor.id, 'user.update', 'user', id, dto);
    return user;
  }

  @Post(':id/credits')
  async adjustCredits(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string, @Body() dto: AdjustCreditsDto) {
    const entry = await this.credits.adminAdjust(id, dto.delta, dto.reason);
    await this.audit.log(actor.id, 'user.credits.adjust', 'user', id, { delta: dto.delta, reason: dto.reason });
    return entry;
  }
}
