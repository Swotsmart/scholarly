# =============================================================================
# Scholarly Platform - Production Dockerfile
# =============================================================================

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate
WORKDIR /app

# Stage: Dependencies
FROM base AS deps

# Copy all package.json files first
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY packages/database/prisma ./packages/database/prisma/
COPY packages/api/package.json ./packages/api/
COPY packages/web/package.json ./packages/web/

# Install all dependencies including devDependencies for build
RUN pnpm install --frozen-lockfile || pnpm install

# Generate Prisma client in deps stage
RUN cd packages/database && pnpm exec prisma generate

# Stage: Builder
FROM base AS builder
WORKDIR /app

# Copy everything from deps including generated prisma client
COPY --from=deps /app ./

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/database/src ./packages/database/src
COPY packages/api ./packages/api
COPY packages/web ./packages/web

# Create public directory and copy landing site
RUN mkdir -p packages/web/public
COPY site/*.html ./packages/web/public/

# Build packages in order
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @scholarly/shared build || true
RUN pnpm --filter @scholarly/database build || true
RUN pnpm --filter @scholarly/api build || true
RUN pnpm --filter @scholarly/web build

# Fix pnpm symlinks in standalone output
# 1. Copy pnpm store to standalone
# 2. Recreate symlinks to point to local store
RUN cd packages/web/.next/standalone && \
    # Copy the pnpm store
    mkdir -p node_modules/.pnpm && \
    cp -r /app/node_modules/.pnpm/* node_modules/.pnpm/ && \
    # Remove broken symlinks and recreate them
    rm -f node_modules/next node_modules/react && \
    # Find the next package and link it
    NEXT_PKG=$(ls node_modules/.pnpm | grep '^next@' | head -1) && \
    ln -sf .pnpm/$NEXT_PKG/node_modules/next node_modules/next && \
    # Find the react package and link it
    REACT_PKG=$(ls node_modules/.pnpm | grep '^react@' | grep -v react-dom | head -1) && \
    ln -sf .pnpm/$REACT_PKG/node_modules/react node_modules/react

# Stage: Production
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl dumb-init
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 scholarly

ENV NODE_ENV=production
ENV PORT=3000

# Copy Next.js standalone output with fixed dependencies
COPY --from=builder --chown=scholarly:nodejs /app/packages/web/.next/standalone ./
# Static files must be at .next/static relative to server.js (which is at /app/)
COPY --from=builder --chown=scholarly:nodejs /app/packages/web/.next/static ./.next/static
# Public files must be at public relative to server.js
COPY --from=builder --chown=scholarly:nodejs /app/packages/web/public ./public

# Copy Prisma schema for migrations
COPY --from=builder --chown=scholarly:nodejs /app/packages/database/prisma ./packages/database/prisma

USER scholarly

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
