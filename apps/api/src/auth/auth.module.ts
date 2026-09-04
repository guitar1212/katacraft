import { Module, type Provider } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { UsersModule } from '../users/users.module';

// GoogleStrategy is only added to `providers` when credentials are present.
// Nest eagerly instantiates every listed provider, and instantiating a
// passport Strategy subclass registers it with passport globally — so
// simply never listing it is what disables Google login, not a runtime
// no-op inside the strategy.
const providers: Provider[] = [AuthService, JwtStrategy];
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(GoogleStrategy);
}

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '15m') as any },
      }),
    }),
  ],
  controllers: [AuthController],
  providers,
  exports: [AuthService],
})
export class AuthModule {}
