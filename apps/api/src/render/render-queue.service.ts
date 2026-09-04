import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, type Job } from 'bullmq';

export const RENDER_QUEUE_NAME = 'render';

export interface RenderJobData {
  renderJobId: string;
}

/**
 * Thin wrapper around a bullmq Queue + Worker. Not using the
 * @nestjs/bullmq package here because, as of this Nest 12 / TS 6 stack,
 * that adapter's peer-dependency range hasn't caught up to Nest 12 yet —
 * bullmq itself has no such constraint, so we drive it directly.
 */
@Injectable()
export class RenderQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(RenderQueueService.name);
  readonly queue: Queue<RenderJobData>;
  private worker?: Worker<RenderJobData>;

  constructor(private config: ConfigService) {
    this.queue = new Queue<RenderJobData>(RENDER_QUEUE_NAME, {
      connection: { url: this.config.get<string>('REDIS_URL', 'redis://localhost:6379') } as any,
    });
  }

  enqueue(data: RenderJobData) {
    return this.queue.add('render', data, {
      attempts: 1,
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86400 },
    });
  }

  /** Registers the job processor. Called once from RenderModule's onModuleInit. */
  startWorker(processor: (job: Job<RenderJobData>) => Promise<void>) {
    if (this.worker) return;
    this.worker = new Worker<RenderJobData>(
      RENDER_QUEUE_NAME,
      async (job) => {
        try {
          await processor(job);
        } catch (err) {
          this.logger.error(`Render job ${job.data.renderJobId} failed`, err as Error);
          throw err;
        }
      },
      { connection: { url: this.config.get<string>('REDIS_URL', 'redis://localhost:6379') } as any, concurrency: 2 },
    );
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue.close();
  }
}
