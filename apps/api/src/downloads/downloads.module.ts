import { Module } from '@nestjs/common';
import { DownloadsController } from './downloads.controller';
import { DownloadsService } from './downloads.service';
import { UsersModule } from '../users/users.module';
import { RenderModule } from '../render/render.module';

@Module({
  imports: [UsersModule, RenderModule],
  controllers: [DownloadsController],
  providers: [DownloadsService],
})
export class DownloadsModule {}
