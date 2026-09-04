# KataCraft API

NestJS backend. See the repo-root [`README.md`](../../README.md) for full setup and [`API_CONTRACT.md`](../../API_CONTRACT.md) for the route reference.

```bash
npm run prisma:generate     # regenerate the Prisma client after any schema.prisma change
npm run prisma:migrate      # create/apply a migration (needs DATABASE_URL reachable)
npm run seed                # seed an admin user + sample models
npm run start:dev           # API + render worker (same process) with hot reload
npm run build                # tsc build to dist/
```

Render jobs run in-process via a bullmq `Worker` started from `RenderService.onModuleInit` — there's no separate worker deployable in this M1 skeleton. Splitting it into its own process later just means moving `RenderQueueService.startWorker(...)` into a small standalone entrypoint that shares the same Prisma schema and `OpenscadCliService`.
