import { Injectable, NotFoundException } from '@nestjs/common';
import type { Role } from '@katacraft/shared';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AdminUsersService {
  constructor(
    private prisma: PrismaService,
    private users: UsersService,
  ) {}

  async list(query: { q?: string; role?: Role; status?: 'ACTIVE' | 'SUSPENDED'; page?: number }) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = 20;
    const where = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' as const } },
              { email: { contains: query.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.user.count({ where }),
    ]);
    return { items: items.map((u) => this.users.toSummary(u)), total };
  }

  async updateRoleStatus(id: string, data: { role?: Role; status?: 'ACTIVE' | 'SUSPENDED' }) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');
    const updated = await this.prisma.user.update({ where: { id }, data });
    return this.users.toSummary(updated);
  }
}
