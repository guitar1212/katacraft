import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  log(actorId: string, action: string, targetType: string, targetId: string, diff?: unknown) {
    return this.prisma.auditLog.create({
      data: { actorId, action, targetType, targetId, diffJson: diff as any },
    });
  }

  async list(page = 1, pageSize = 30) {
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { actor: { select: { name: true } } },
      }),
      this.prisma.auditLog.count(),
    ]);
    return {
      items: items.map((i) => ({
        id: i.id,
        actorId: i.actorId,
        actorName: i.actor.name,
        action: i.action,
        targetType: i.targetType,
        targetId: i.targetId,
        createdAt: i.createdAt.toISOString(),
      })),
      total,
    };
  }
}
