import { Body, Controller, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common';
import type { RenderJobStatus } from '@katacraft/shared';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types';
import { RenderService } from './render.service';
import { CreateRenderDto } from './dto/create-render.dto';

@Controller('render')
@UseGuards(JwtAuthGuard)
export class RenderController {
  constructor(private renderService: RenderService) {}

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRenderDto): Promise<RenderJobStatus> {
    const job = await this.renderService.createPreviewJob(user.id, dto.modelVersionId, dto.params);
    return toStatus(job);
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<RenderJobStatus> {
    const job = await this.renderService.getJob(id);
    if (job.userId !== user.id && user.role === 'MEMBER') {
      throw new ForbiddenException();
    }
    return toStatus(job);
  }
}

function toStatus(job: { id: string; status: string; purpose: string; outputUrl: string | null; error: string | null }): RenderJobStatus {
  return {
    id: job.id,
    status: job.status as RenderJobStatus['status'],
    purpose: job.purpose as RenderJobStatus['purpose'],
    outputUrl: job.outputUrl,
    error: job.error,
  };
}
