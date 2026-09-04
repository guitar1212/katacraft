import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

/**
 * `AuthGuard('jwt')` (used as JwtAuthGuard across many feature modules)
 * needs an `AuthModuleOptions` provider in scope wherever it's instantiated
 * — a bare `PassportModule` import provides nothing (see
 * @nestjs/passport's PassportModule.register()); only the dynamic-module
 * form does. Registering it once here, globally, means every feature
 * module using JwtAuthGuard/RolesGuard just works without each of them
 * having to call PassportModule.register(...) themselves.
 */
@Global()
@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  exports: [PassportModule],
})
export class GlobalAuthModule {}
