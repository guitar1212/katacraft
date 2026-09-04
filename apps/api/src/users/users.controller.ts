import { Body, Controller, Get, HttpCode, NotFoundException, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types';
import { UsersService } from './users.service';
import { CreditsService } from './credits.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private users: UsersService,
    private credits: CreditsService,
  ) {}

  @Get('me/credits')
  async myCredits(@CurrentUser() user: AuthenticatedUser, @Query('page') page?: string) {
    const fresh = await this.users.findById(user.id);
    if (!fresh) throw new NotFoundException();
    const ledger = await this.credits.getLedger(user.id, page ? Number(page) : 1);
    return {
      balance: fresh.creditsBalance,
      ledger: ledger.map((entry) => ({
        id: entry.id,
        delta: entry.delta,
        reason: entry.reason,
        createdAt: entry.createdAt.toISOString(),
        balanceAfter: entry.balanceAfter,
      })),
    };
  }

  @Patch('me')
  async updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    const updated = await this.users.updateProfile(user.id, dto);
    return this.users.toSummary(updated);
  }

  @Post('me/password')
  @HttpCode(204)
  async changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    await this.users.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }
}
