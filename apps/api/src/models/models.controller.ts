import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ModelsService } from './models.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types';

@Controller()
export class ModelsController {
  constructor(private models: ModelsService) {}

  @Get('models')
  list(
    @Query('kind') kind?: 'MODEL' | 'PRINTABLE',
    @Query('categoryId') categoryId?: string,
    @Query('q') q?: string,
    @Query('sort') sort?: 'popular' | 'newest',
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.models.listPublic({
      kind,
      categoryId,
      q,
      sort,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('models/:slug')
  getOne(@Param('slug') slug: string) {
    return this.models.getBySlug(slug);
  }

  @Post('models/:id/favorite')
  @UseGuards(JwtAuthGuard)
  favorite(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.models.toggleFavorite(user.id, id);
  }

  @Get('favorites')
  @UseGuards(JwtAuthGuard)
  favorites(@CurrentUser() user: AuthenticatedUser) {
    return this.models.listFavorites(user.id);
  }
}
