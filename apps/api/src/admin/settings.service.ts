import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SETTINGS_ID = 'default';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async get() {
    const existing = await this.prisma.systemSettings.findUnique({ where: { id: SETTINGS_ID } });
    if (existing) return existing;
    return this.prisma.systemSettings.create({ data: { id: SETTINGS_ID } });
  }

  async update(data: { signupBonusCredits?: number; defaultDownloadCreditCost?: number }) {
    await this.get();
    return this.prisma.systemSettings.update({ where: { id: SETTINGS_ID }, data });
  }
}
