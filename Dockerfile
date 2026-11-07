# syntax=docker/dockerfile:1

# ---- dependencies ----
FROM node:22-alpine AS deps
# build tools are only needed if better-sqlite3 has no prebuilt binary for the platform
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# The env vars are validated at build time; these are throwaway values that never end
# up in the image's runtime environment.
RUN DATABASE_URL=file:/tmp/build.db \
    ADMIN_PASSWORD=build-time-only \
    NEXTAUTH_SECRET=build-time-only-secret \
    npx prisma generate && npm run build

# ---- run ----
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_URL=file:/data/hilde.db

# Prisma CLI, only used to apply the migrations on start (pinned to the app's version)
RUN npm install -g prisma@6.19.3 && npm cache clean --force

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs \
    && mkdir /data && chown nextjs:nodejs /data

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --chown=nextjs:nodejs entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

USER nextjs
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://127.0.0.1:3000/api/auth/csrf >/dev/null || exit 1
ENTRYPOINT ["./entrypoint.sh"]
