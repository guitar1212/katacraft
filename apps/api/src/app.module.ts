import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { GlobalAuthModule } from './common/global-auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { ModelsModule } from './models/models.module';
import { RenderModule } from './render/render.module';
import { DownloadsModule } from './downloads/downloads.module';
import { AdminModule } from './admin/admin.module';
import { DomainExceptionsFilter } from './common/filters/domain-exceptions.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    GlobalAuthModule,
    PrismaModule,
    StorageModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ModelsModule,
    RenderModule,
    DownloadsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_FILTER, useClass: DomainExceptionsFilter }],
})
export class AppModule {}
