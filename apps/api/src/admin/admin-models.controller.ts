import { Body, Controller, Get, Param, Post, Patch, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@katacraft/shared';
import { ModelsService } from '../models/models.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types';
import { CreateModelDto, UpdateModelDto, CreateVersionDto, PublishDto } from '../models/dto/model.dto';

@Controller('admin/models')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DESIGNER, Role.ADMIN)
export class AdminModelsController {
  constructor(
    private models: ModelsService,
    private storage: StorageService,
    private audit: AuditService,
  ) {}

  @Get()
  list(@Query('status') status?: string, @Query('q') q?: string, @Query('page') page?: string) {
    return this.models.adminList({ status, q, page: page ? Number(page) : undefined });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.models.adminGet(id);
  }

  @Post()
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateModelDto) {
    const model = await this.models.create(user.id, dto);
    await this.audit.log(user.id, 'model.create', 'model', model.id, dto);
    return this.models.toSummary(model);
  }

  @Patch(':id')
  async update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateModelDto) {
    const model = await this.models.update(id, dto);
    await this.audit.log(user.id, 'model.update', 'model', id, dto);
    return this.models.toSummary(model);
  }

  @Get(':id/versions')
  listVersions(@Param('id') id: string) {
    return this.models.listVersions(id);
  }

  @Get(':id/versions/:versionId')
  getVersion(@Param('id') id: string, @Param('versionId') versionId: string) {
    return this.models.getVersion(id, versionId);
  }

  @Post(':id/versions')
  async createVersion(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateVersionDto) {
    const version = await this.models.createVersion(id, user.id, dto.scadSource, dto.paramSchema);
    await this.audit.log(user.id, 'model.version.create', 'model_version', version.id, { modelId: id, versionNo: version.versionNo });
    return { id: version.id, versionNo: version.versionNo };
  }

  @Post(':id/publish')
  async publish(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: PublishDto) {
    const model = await this.models.publish(id, dto.versionId);
    await this.audit.log(user.id, 'model.publish', 'model', id, { versionId: dto.versionId });
    return this.models.toSummary(model);
  }

  @Post(':id/unpublish')
  async unpublish(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const model = await this.models.unpublish(id);
    await this.audit.log(user.id, 'model.unpublish', 'model', id);
    return this.models.toSummary(model);
  }

  @Post(':id/printable-files')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 200 * 1024 * 1024 } }))
  async addPrintableFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const stored = await this.storage.saveBuffer('printable', file.originalname, file.buffer);
    const record = await this.models.addPrintableFile(id, {
      fileUrl: stored.url,
      filename: file.originalname,
      sizeBytes: file.size,
    });
    await this.audit.log(user.id, 'model.printable_file.add', 'model', id, { filename: file.originalname });
    return record;
  }
}
