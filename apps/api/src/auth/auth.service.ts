import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { CreditReason } from '@katacraft/shared';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreditsService } from '../users/credits.service';
import { parseDurationMs } from '../common/utils/duration';
import type { User } from '../generated/prisma/client';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private users: UsersService,
    private credits: CreditsService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(email: string, password: string, name: string) {
    const user = await this.users.createWithPassword(email, password, name);
    const bonus = Number(this.config.get<string>('SIGNUP_BONUS_CREDITS', '50'));
    if (bonus > 0) {
      await this.credits.grantStandalone(user.id, bonus, CreditReason.SIGNUP_BONUS);
    }
    const fresh = await this.users.findById(user.id);
    return this.issueTokens(fresh!);
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmail(email);
    if (!user || !(await this.users.verifyPassword(user, password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is suspended');
    }
    return this.issueTokens(user);
  }

  async loginWithGoogleProfile(googleId: string, email: string, name: string) {
    const { user, created } = await this.users.findOrCreateByGoogle(googleId, email, name);
    if (created) {
      const bonus = Number(this.config.get<string>('SIGNUP_BONUS_CREDITS', '50'));
      if (bonus > 0) await this.credits.grantStandalone(user.id, bonus, CreditReason.SIGNUP_BONUS);
    }
    return this.issueTokens(user);
  }

  async refresh(rawRefreshToken: string) {
    const tokenHash = hashToken(rawRefreshToken);
    const record = await this.prisma.refreshToken.findFirst({ where: { tokenHash, revoked: false } });
    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const user = await this.users.findById(record.userId);
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException();
    }

    await this.prisma.refreshToken.update({ where: { id: record.id }, data: { revoked: true } });
    return this.issueTokens(user);
  }

  async logout(rawRefreshToken: string | undefined) {
    if (!rawRefreshToken) return;
    const tokenHash = hashToken(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({ where: { tokenHash }, data: { revoked: true } });
  }

  private async issueTokens(user: User): Promise<TokenPair & { user: User }> {
    const accessToken = this.jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: this.config.get<string>('JWT_SECRET'),
        expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '15m') as any,
      },
    );

    const rawRefreshToken = randomBytes(48).toString('hex');
    const refreshTtlMs = parseDurationMs(this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'));
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawRefreshToken),
        expiresAt: new Date(Date.now() + refreshTtlMs),
      },
    });

    return { accessToken, refreshToken: rawRefreshToken, user };
  }
}

function hashToken(raw: string) {
  return createHash('sha256').update(raw).digest('hex');
}
