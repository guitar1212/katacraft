import { BadRequestException, Injectable } from '@nestjs/common';
import { CreditReason } from '@katacraft/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '../generated/prisma/client';

type Tx = Prisma.TransactionClient;

/**
 * All credit balance changes go through here as append-only ledger entries
 * (never a direct `creditsBalance` write elsewhere) so the balance is
 * always reconstructable/auditable from `credits_ledger`.
 *
 * `grant`/`spend` take a transaction client so callers (e.g. DownloadsService)
 * can compose them with other writes (creating a RenderJob, a Download row)
 * in one atomic transaction. `grantStandalone`/`spendStandalone` open their
 * own transaction for simple one-off callers (signup bonus, admin adjustment).
 */
@Injectable()
export class CreditsService {
  constructor(private prisma: PrismaService) {}

  async grant(
    tx: Tx,
    userId: string,
    amount: number,
    reason: CreditReason | string,
    ref?: { type: string; id: string },
  ) {
    if (amount <= 0) throw new BadRequestException('grant amount must be positive');
    const user = await tx.user.update({
      where: { id: userId },
      data: { creditsBalance: { increment: amount } },
    });
    await tx.creditLedger.create({
      data: {
        userId,
        delta: amount,
        reason,
        refType: ref?.type,
        refId: ref?.id,
        balanceAfter: user.creditsBalance,
      },
    });
    return user.creditsBalance;
  }

  /** Atomically decrements only if the balance covers `amount`; throws otherwise. */
  async spend(
    tx: Tx,
    userId: string,
    amount: number,
    reason: CreditReason | string,
    ref?: { type: string; id: string },
  ) {
    if (amount <= 0) throw new BadRequestException('spend amount must be positive');
    const result = await tx.user.updateMany({
      where: { id: userId, creditsBalance: { gte: amount } },
      data: { creditsBalance: { decrement: amount } },
    });
    if (result.count === 0) {
      throw new BadRequestException('Insufficient credits');
    }
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    await tx.creditLedger.create({
      data: {
        userId,
        delta: -amount,
        reason,
        refType: ref?.type,
        refId: ref?.id,
        balanceAfter: user.creditsBalance,
      },
    });
    return user.creditsBalance;
  }

  async grantStandalone(userId: string, amount: number, reason: CreditReason | string, ref?: { type: string; id: string }) {
    return this.prisma.$transaction((tx) => this.grant(tx, userId, amount, reason, ref));
  }

  async adminAdjust(userId: string, delta: number, reason: string) {
    return this.prisma.$transaction(async (tx) => {
      if (delta === 0) throw new BadRequestException('delta must be non-zero');
      return delta > 0
        ? this.grant(tx, userId, delta, CreditReason.ADMIN_ADJUST, undefined)
        : this.spend(tx, userId, -delta, CreditReason.ADMIN_ADJUST, undefined).catch(() => {
            throw new BadRequestException('Cannot reduce credits below zero');
          });
    }).then(async () => {
      const entry = await this.prisma.creditLedger.findFirst({
        where: { userId, reason: CreditReason.ADMIN_ADJUST },
        orderBy: { createdAt: 'desc' },
      });
      return entry!;
    });
  }

  async getLedger(userId: string, page = 1, pageSize = 20) {
    return this.prisma.creditLedger.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }
}
