# syntax=docker/dockerfile:1
#
# biliardino - multi-stage image: install -> build -> small runtime image.
# Build:  docker build -t biliardino .
# Run:    see docker-compose.yml / dockge/compose.yaml

# ---- dependencies ----
FROM node:22-alpine AS deps
# build tools are only used if better-sqlite3 has no prebuilt binary for the platform
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
# `npm ci` runs `prisma generate` (postinstall), which needs the schema and prisma.config.ts;
# it writes the client to src/generated/prisma
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

# ---- build ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY --from=deps /app/src/generated ./src/generated
ENV NEXT_TELEMETRY_DISABLED=1
# The env vars are validated at build time; these throwaway values never reach the final image.
RUN DATABASE_URL=file:/tmp/build.db \
    ADMIN_PASSWORD=build-time-only \
    NEXTAUTH_SECRET=build-time-only-secret \
    npm run build \
 && node -p "require('./node_modules/prisma/package.json').version" > .next/prisma-version

# ---- run ----
FROM node:22-alpine AS runner
# openssl: needed by the Prisma CLI that applies migrations; tzdata: TZ support
RUN apk add --no-cache libc6-compat openssl tzdata
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_URL=file:/data/biliardino.db \
    # use the address from the browser when NEXTAUTH_URL isn't set
    AUTH_TRUST_HOST=true \
    # no update checks / telemetry from the Prisma CLI
    CHECKPOINT_DISABLE=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1

# Prisma CLI, only used to apply the migrations on start (same version as the app)
COPY --from=builder /app/.next/prisma-version /tmp/prisma-version
RUN npm install -g "prisma@$(cat /tmp/prisma-version)" && npm cache clean --force

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs \
    && mkdir /data && chown nextjs:nodejs /data

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./
COPY --chmod=755 entrypoint.sh ./entrypoint.sh

# Runs as an unprivileged user. To use your own user (e.g. TrueNAS "apps", 568:568),
# set `user:` in the compose file and make the data folder writable for it.
USER nextjs
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
ENTRYPOINT ["./entrypoint.sh"]
