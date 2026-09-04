import { Module } from '@nestjs/common';
import { RenderController } from './render.controller';
import { RenderService } from './render.service';
import { RenderQueueService } from './render-queue.service';
import { OpenscadCliService } from './openscad-cli.service';
import { StorageModule } from '../storage/storage.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [StorageModule, UsersModule],
  controllers: [RenderController],
  providers: [RenderService, RenderQueueService, OpenscadCliService],
  exports: [RenderService, RenderQueueService],
})
export class RenderModule {}
