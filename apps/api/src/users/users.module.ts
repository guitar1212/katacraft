import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreditsService } from './credits.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, CreditsService],
  exports: [UsersService, CreditsService],
})
export class UsersModule {}
