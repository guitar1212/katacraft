import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@katacraft/shared';
import { CategoriesService } from '../categories/categories.service';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types';
import { CreateCategoryDto, UpdateCategoryDto } from '../categories/dto/category.dto';

@Controller('admin/categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DESIGNER, Role.ADMIN)
export class AdminCategoriesController {
  constructor(
    private categories: CategoriesService,
    private audit: AuditService,
  ) {}

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCategoryDto) {
    const category = await this.categories.create(dto.name, dto.sortOrder);
    await this.audit.log(user.id, 'category.create', 'category', category.id, dto);
    return category;
  }

  @Patch(':id')
  async update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    const category = await this.categories.update(id, dto);
    await this.audit.log(user.id, 'category.update', 'category', id, dto);
    return category;
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.categories.remove(id);
    await this.audit.log(user.id, 'category.delete', 'category', id);
    return { success: true };
  }
}
