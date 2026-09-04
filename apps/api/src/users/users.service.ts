import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { UserSummary } from '@katacraft/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { User } from '../generated/prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  toSummary(user: User): UserSummary {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserSummary['role'],
      status: user.status as UserSummary['status'],
      creditsBalance: user.creditsBalance,
      language: user.language,
    };
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async createWithPassword(email: string, password: string, name: string) {
    const existing = await this.findByEmail(email);
    if (existing) throw new BadRequestException('Email already registered');
    const passwordHash = await bcrypt.hash(password, 12);
    return this.prisma.user.create({
      data: { email: email.toLowerCase(), passwordHash, name },
    });
  }

  async findOrCreateByGoogle(googleId: string, email: string, name: string) {
    const existing = await this.prisma.user.findUnique({ where: { googleId } });
    if (existing) return { user: existing, created: false };

    const byEmail = await this.findByEmail(email);
    if (byEmail) {
      const linked = await this.prisma.user.update({ where: { id: byEmail.id }, data: { googleId } });
      return { user: linked, created: false };
    }

    const created = await this.prisma.user.create({ data: { email: email.toLowerCase(), name, googleId } });
    return { user: created, created: true };
  }

  async verifyPassword(user: User, password: string) {
    if (!user.passwordHash) return false;
    return bcrypt.compare(password, user.passwordHash);
  }

  async updateProfile(userId: string, data: { name?: string; language?: string }) {
    return this.prisma.user.update({ where: { id: userId }, data });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const ok = await this.verifyPassword(user, currentPassword);
    if (!ok) throw new BadRequestException('Current password is incorrect');
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }
}
