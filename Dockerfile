# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────────────────────
# Pegel – Multi-Stage-Build
#   deps     → alle npm-Abhängigkeiten (für Build und Migrationen)
#   builder  → Prisma-Client erzeugen, Next.js-Produktionsbuild (standalone)
#   migrator → kleines Hilfsimage für "prisma migrate deploy" + Seed (One-Shot)
#   runner   → schlankes Produktionsimage, läuft als unprivilegierter Benutzer
# ─────────────────────────────────────────────────────────────────────────────
ARG NODE_IMAGE=node:24.20.0-alpine3.24

FROM ${NODE_IMAGE} AS base
# openssl wird von der Prisma-Schema-Engine (Migrationen) benötigt
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
# Install-Skripte laufen nur für die in package.json unter "allowScripts" freigegebenen Pakete
# (u. a. Prisma-Engines); "postinstall" erzeugt den Prisma-Client.
RUN npm ci --no-audit --no-fund

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_OPTIONS=--max-old-space-size=2048
RUN npx prisma generate && npm run build

FROM base AS migrator
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY src/lib ./src/lib
COPY --from=builder /app/src/generated ./src/generated
USER node
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed"]

FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 pegel && adduser -S -u 1001 -G pegel pegel
COPY --from=builder --chown=pegel:pegel /app/.next/standalone ./
COPY --from=builder --chown=pegel:pegel /app/.next/static ./.next/static
COPY --from=builder --chown=pegel:pegel /app/public ./public
USER pegel
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
CMD ["node", "server.js"]
