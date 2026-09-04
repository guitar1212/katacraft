import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { UserSummary } from '@katacraft/shared';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/types';
import { parseDurationMs } from '../common/utils/duration';

const REFRESH_COOKIE = 'kc_refresh';

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private users: UsersService,
    private config: ConfigService,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.auth.register(dto.email, dto.password, dto.name);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken, user: this.users.toSummary(user) };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.auth.login(dto.email, dto.password);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken, user: this.users.toSummary(user) };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[REFRESH_COOKIE];
    const { accessToken, refreshToken } = await this.auth.refresh(raw);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[REFRESH_COOKIE];
    await this.auth.logout(raw);
    res.clearCookie(REFRESH_COOKIE, { path: '/auth' });
  }

  @Get('google/status')
  googleStatus() {
    return { enabled: Boolean(this.config.get<string>('GOOGLE_CLIENT_ID')) };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Redirect handled by passport-google-oauth20.
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const profile = req.user as { googleId: string; email: string; name: string };
    const { accessToken, refreshToken } = await this.auth.loginWithGoogleProfile(profile.googleId, profile.email, profile.name);
    this.setRefreshCookie(res, refreshToken);
    const webOrigin = this.config.get<string>('WEB_ORIGIN', 'http://localhost:5173');
    res.redirect(`${webOrigin}/auth/callback?token=${encodeURIComponent(accessToken)}`);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() authUser: AuthenticatedUser): Promise<UserSummary> {
    const user = await this.users.findById(authUser.id);
    return this.users.toSummary(user!);
  }

  private setRefreshCookie(res: Response, token: string) {
    const maxAge = parseDurationMs(this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'));
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get<string>('NODE_ENV') === 'production',
      path: '/auth',
      maxAge,
    });
  }
}
