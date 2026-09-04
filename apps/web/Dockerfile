# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /repo

# Copy just enough of the monorepo to install deps and build this app.
# (packages/shared is TS-source-only and consumed directly via a Vite alias,
# so it needs to be present at the same relative path during build.)
COPY package.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

WORKDIR /repo/apps/web
RUN npm install
RUN npm run build

# --- Runtime stage ---
FROM nginx:1.27-alpine AS runtime
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
