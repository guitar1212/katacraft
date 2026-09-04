import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@katacraft/shared';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminAuditController {
  constructor(private audit: AuditService) {}

  @Get()
  list(@Query('page') page?: string) {
    return this.audit.list(page ? Number(page) : undefined);
  }
}
