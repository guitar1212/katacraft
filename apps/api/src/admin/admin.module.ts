import { Module } from '@nestjs/common';
import { AdminModelsController } from './admin-models.controller';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminAuditController } from './admin-audit.controller';
import { AdminSettingsController } from './admin-settings.controller';
import { AdminUsersService } from './admin-users.service';
import { SettingsService } from './settings.service';
import { ModelsModule } from '../models/models.module';
import { CategoriesModule } from '../categories/categories.module';
import { UsersModule } from '../users/users.module';
import { StorageModule } from '../storage/storage.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [ModelsModule, CategoriesModule, UsersModule, StorageModule, AuditModule],
  controllers: [
    AdminModelsController,
    AdminCategoriesController,
    AdminUsersController,
    AdminAuditController,
    AdminSettingsController,
  ],
  providers: [AdminUsersService, SettingsService],
})
export class AdminModule {}
