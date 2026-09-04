import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import type { Job } from 'bullmq';
import { ExportFormat, ParamSchemaSchema, RenderPurpose, RenderStatus, sanitizeParamValues } from '@katacraft/shared';
import { PrismaService } from '../prisma/prisma.service';
import { RenderQueueService, type RenderJobData } from './render-queue.service';
import { OpenscadCliService } from './openscad-cli.service';
import { CreditsService } from '../users/credits.service';
import { CreditReason } from '@katacraft/shared';

const PREVIEW_FN = 30;
const FINAL_FN = 100;

@Injectable()
export class RenderService implements OnModuleInit {
  private readonly logger = new Logger(RenderService.name);

  constructor(
    private prisma: PrismaService,
    private queue: RenderQueueService,
    private openscad: OpenscadCliService,
    private credits: CreditsService,
  ) {}

  onModuleInit() {
    this.queue.startWorker((job) => this.process(job));
  }

  async createPreviewJob(userId: string, modelVersionId: string, params: Record<string, unknown>) {
    const version = await this.prisma.modelVersion.findUnique({
      where: { id: modelVersionId },
      include: { model: true },
    });
    if (!version) throw new NotFoundException('Model version not found');

    // Validate up front so we return a 400 immediately instead of queuing
    // a job that will just fail in the worker.
    const schema = ParamSchemaSchema.parse(version.paramSchemaJson);
    sanitizeParamValues(schema, params);

    const job = await this.prisma.renderJob.create({
      data: {
        userId,
        modelId: version.modelId,
        modelVersionId: version.id,
        purpose: RenderPurpose.PREVIEW,
        format: ExportFormat.STL,
        paramsJson: params as any,
        status: RenderStatus.QUEUED,
      },
    });
    await this.queue.enqueue({ renderJobId: job.id });
    return job;
  }

  /** Used internally by DownloadsService — never exposed directly to clients as purpose=FINAL. */
  async createFinalJob(
    userId: string,
    modelVersionId: string,
    params: Record<string, unknown>,
    format: ExportFormat,
  ) {
    const version = await this.prisma.modelVersion.findUnique({ where: { id: modelVersionId } });
    if (!version) throw new NotFoundException('Model version not found');
    const schema = ParamSchemaSchema.parse(version.paramSchemaJson);
    sanitizeParamValues(schema, params);

    const job = await this.prisma.renderJob.create({
      data: {
        userId,
        modelId: version.modelId,
        modelVersionId: version.id,
        purpose: RenderPurpose.FINAL,
        format,
        paramsJson: params as any,
        status: RenderStatus.QUEUED,
      },
    });
    await this.queue.enqueue({ renderJobId: job.id });
    return job;
  }

  async getJob(id: string) {
    const job = await this.prisma.renderJob.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Render job not found');
    return job;
  }

  private async process(job: Job<RenderJobData>) {
    const renderJobId = job.data.renderJobId;
    const record = await this.prisma.renderJob.findUnique({
      where: { id: renderJobId },
      include: { modelVersion: true, model: true },
    });
    if (!record) return;

    await this.prisma.renderJob.update({ where: { id: renderJobId }, data: { status: RenderStatus.PROCESSING } });

    try {
      const schema = ParamSchemaSchema.parse(record.modelVersion.paramSchemaJson);
      const result = await this.openscad.render({
        scadSource: record.modelVersion.scadSource,
        paramSchema: schema,
        rawParams: record.paramsJson as Record<string, unknown>,
        format: record.format as ExportFormat,
        fn: record.purpose === RenderPurpose.FINAL ? FINAL_FN : PREVIEW_FN,
        outputPrefix: record.purpose === RenderPurpose.FINAL ? 'render-final' : 'render-preview',
      });

      await this.prisma.renderJob.update({
        where: { id: renderJobId },
        data: { status: RenderStatus.DONE, outputUrl: result.outputUrl, finishedAt: new Date() },
      });

      if (record.purpose === RenderPurpose.FINAL) {
        await this.finalizeDownload(renderJobId, result.outputUrl);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown render error';
      this.logger.error(`Render job ${renderJobId} failed: ${message}`);
      await this.prisma.renderJob.update({
        where: { id: renderJobId },
        data: { status: RenderStatus.FAILED, error: message, finishedAt: new Date() },
      });

      if (record.purpose === RenderPurpose.FINAL) {
        await this.refundFailedDownload(renderJobId);
      }
    }
  }

  /** On a successful FINAL render, stamp the pre-created Download row with the file URL and bump counters. */
  private async finalizeDownload(renderJobId: string, outputUrl: string) {
    const download = await this.prisma.download.findUnique({ where: { renderJobId } });
    if (!download) return;
    await this.prisma.$transaction([
      this.prisma.download.update({ where: { id: download.id }, data: { downloadUrl: outputUrl } }),
      this.prisma.model.update({ where: { id: download.modelId }, data: { downloadCount: { increment: 1 } } }),
    ]);
  }

  /** On a failed FINAL render, refund the credits that were charged up front. */
  private async refundFailedDownload(renderJobId: string) {
    const download = await this.prisma.download.findUnique({ where: { renderJobId } });
    if (!download || download.creditsSpent <= 0) return;
    await this.prisma.$transaction((tx) =>
      this.credits.grant(tx, download.userId, download.creditsSpent, CreditReason.REFUND, {
        type: 'download',
        id: download.id,
      }),
    );
  }
}
