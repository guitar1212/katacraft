# Builds the KataCraft API + render worker image with a real OpenSCAD CLI
# baked in, so `docker compose up` gives you working renders without
# installing OpenSCAD on the host.
FROM node:24-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
    openscad \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /repo
COPY package.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
RUN npm install --workspace=@katacraft/shared --workspace=api --include-workspace-root

COPY packages/shared packages/shared
COPY apps/api apps/api

WORKDIR /repo/apps/api
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
ENV OPENSCAD_BIN=openscad
EXPOSE 3000
CMD ["node", "dist/main.js"]
