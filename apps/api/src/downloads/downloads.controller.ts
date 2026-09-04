import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { DownloadsService } from './downloads.service';
import { CreateDownloadDto } from './dto/create-download.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types';

@Controller('downloads')
@UseGuards(JwtAuthGuard)
export class DownloadsController {
  constructor(private downloads: DownloadsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDownloadDto) {
    return this.downloads.create(user.id, dto);
  }

  @Get()
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.downloads.listMine(user.id);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.downloads.get(user.id, id);
  }
}
