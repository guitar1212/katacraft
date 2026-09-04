import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy, type Profile, type VerifyCallback } from 'passport-google-oauth20';

/**
 * Only ever registered as a Nest provider when GOOGLE_CLIENT_ID/SECRET are
 * set (see AuthModule) — Nest eagerly instantiates every listed provider,
 * and instantiating a passport Strategy subclass registers it with
 * passport globally, so keeping it out of the providers array entirely
 * (rather than constructing it and no-op'ing) is what actually disables it.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GOOGLE_CLIENT_ID')!,
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET')!,
      callbackURL: config.get<string>('GOOGLE_CALLBACK_URL')!,
      scope: ['email', 'profile'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      done(new Error('Google account has no email'), undefined);
      return;
    }
    done(null, {
      googleId: profile.id,
      email,
      name: profile.displayName || email.split('@')[0],
    });
  }
}
