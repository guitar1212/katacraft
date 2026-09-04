import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreditReason, DownloadMethod, ExportFormat, ModelKind, ModelStatus, ParamSchemaSchema, sanitizeParamValues } from '@katacraft/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CreditsService } from '../users/credits.service';
import { RenderQueueService } from '../render/render-queue.service';
import type { DownloadRecord } from '@katacraft/shared';
import type { Download } from '../generated/prisma/client';

@Injectable()
export class DownloadsService {
  constructor(
    private prisma: PrismaService,
    private credits: CreditsService,
    private queue: RenderQueueService,
  ) {}

  private toRecord(download: Download & { model: { name: string } }): DownloadRecord {
    return {
      id: download.id,
      modelId: download.modelId,
      modelName: download.model.name,
      method: download.method as DownloadMethod,
      creditsSpent: download.creditsSpent,
      downloadUrl: download.downloadUrl,
      createdAt: download.createdAt.toISOString(),
    };
  }

  async create(userId: string, input: { modelId: string; modelVersionId?: string; params?: Record<string, unknown>; format?: ExportFormat }) {
    const model = await this.prisma.model.findUnique({ where: { id: input.modelId } });
    if (!model || model.status !== ModelStatus.PUBLISHED) throw new NotFoundException('Model not found');

    if (model.kind === ModelKind.PRINTABLE) {
      return this.createPrintableDownload(userId, model);
    }
    return this.createModelDownload(userId, model, input);
  }

  private async createPrintableDownload(userId: string, model: { id: string; name: string; creditCost: number }) {
    const file = await this.prisma.printableFile.findFirst({ where: { modelId: model.id }, orderBy: { createdAt: 'asc' } });
    if (!file) throw new BadRequestException('This printable has no files uploaded yet');

    const download = await this.prisma.$transaction(async (tx) => {
      if (model.creditCost > 0) {
        await this.credits.spend(tx, userId, model.creditCost, CreditReason.DOWNLOAD, { type: 'model', id: model.id });
      }
      await tx.model.update({ where: { id: model.id }, data: { downloadCount: { increment: 1 } } });
      return tx.download.create({
        data: {
          userId,
          modelId: model.id,
          creditsSpent: model.creditCost,
          method: DownloadMethod.DOWNLOAD,
          downloadUrl: file.fileUrl,
        },
        include: { model: { select: { name: true } } },
      });
    });

    return { download: this.toRecord(download), renderJobId: null };
  }

  private async createModelDownload(
    userId: string,
    model: { id: string; name: string; creditCost: number; currentVersionId: string | null },
    input: { modelVersionId?: string; params?: Record<string, unknown>; format?: ExportFormat },
  ) {
    const modelVersionId = input.modelVersionId ?? model.currentVersionId;
    if (!modelVersionId) throw new BadRequestException('This model has no published version');

    const version = await this.prisma.modelVersion.findUnique({ where: { id: modelVersionId } });
    if (!version || version.modelId !== model.id) throw new NotFoundException('Model version not found');

    const schema = ParamSchemaSchema.parse(version.paramSchemaJson);
    // Validate before charging any credits — a bad request must never cost the user.
    sanitizeParamValues(schema, input.params ?? {});

    const format = input.format ?? ExportFormat.STL;

    const { download, renderJobId } = await this.prisma.$transaction(async (tx) => {
      if (model.creditCost > 0) {
        await this.credits.spend(tx, userId, model.creditCost, CreditReason.DOWNLOAD, { type: 'model', id: model.id });
      }
      const renderJob = await tx.renderJob.create({
        data: {
          userId,
          modelId: model.id,
          modelVersionId,
          purpose: 'FINAL',
          format,
          paramsJson: (input.params ?? {}) as any,
          status: 'QUEUED',
        },
      });
      const download = await tx.download.create({
        data: {
          userId,
          modelId: model.id,
          modelVersionId,
          renderJobId: renderJob.id,
          creditsSpent: model.creditCost,
          method: DownloadMethod.DOWNLOAD,
        },
        include: { model: { select: { name: true } } },
      });
      return { download, renderJobId: renderJob.id };
    });

    // Only enqueue after the transaction has committed — never enqueue a
    // job whose DB row might get rolled back.
    await this.queue.enqueue({ renderJobId });

    return { download: this.toRecord(download), renderJobId };
  }

  async get(userId: string, id: string): Promise<DownloadRecord> {
    const download = await this.prisma.download.findUnique({ where: { id }, include: { model: { select: { name: true } } } });
    if (!download || download.userId !== userId) throw new NotFoundException('Download not found');
    return this.toRecord(download);
  }

  async listMine(userId: string): Promise<DownloadRecord[]> {
    const downloads = await this.prisma.download.findMany({
      where: { userId },
      include: { model: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return downloads.map((d) => this.toRecord(d));
  }
}
