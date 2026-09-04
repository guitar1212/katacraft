import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { Role } from '@katacraft/shared';
import { SettingsService } from './settings.service';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types';
import { UpdateSettingsDto } from './dto/admin.dto';

@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminSettingsController {
  constructor(
    private settings: SettingsService,
    private audit: AuditService,
  ) {}

  @Get()
  get() {
    return this.settings.get();
  }

  @Patch()
  async update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateSettingsDto) {
    const updated = await this.settings.update(dto);
    await this.audit.log(user.id, 'settings.update', 'system_settings', 'default', dto);
    return updated;
  }
}
