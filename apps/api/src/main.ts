import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.enableCors({
    origin: buildCorsOrigin(),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`KataCraft API listening on http://localhost:${port}`);
}
bootstrap();

/**
 * WEB_ORIGIN covers the normal case. Inside a GitHub Codespace, the
 * browser talks to the API through its own forwarded *.app.github.dev
 * subdomain (not localhost), which can drift from whatever WEB_ORIGIN was
 * baked into apps/api/.env at container-create time — so when CODESPACES
 * is set, also accept any origin under this Codespace's own forwarding
 * domain instead of requiring an exact match.
 */
function buildCorsOrigin(): string | RegExp | (string | RegExp)[] {
  const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:5173';
  if (process.env.CODESPACES !== 'true') return webOrigin;

  const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ?? 'app.github.dev';
  const codespacePattern = new RegExp(`^https://.+-\\d+\\.${domain.replace(/\./g, '\\.')}$`);
  return [webOrigin, codespacePattern];
}
