# =============================================================================
# SCHOLARLY PLATFORM - PRODUCTION DOCKERFILE
# =============================================================================
#
# Multi-stage build for optimal production image:
# Stage 1: Dependencies (cached layer)
# Stage 2: Build (TypeScript compilation)
# Stage 3: Production (minimal runtime image)
#
# Usage:
#   docker build -t scholarly-api .
#   docker run -p 3000:3000 --env-file .env scholarly-api
#
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps

# Add build dependencies for native modules
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json* ./
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY packages/validation/package.json ./packages/validation/
COPY services/early-years/package.json ./services/early-years/
COPY services/linguaflow/package.json ./services/linguaflow/
COPY apps/api/package.json ./apps/api/

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# -----------------------------------------------------------------------------
# Stage 2: Build
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/validation/node_modules ./packages/validation/node_modules
COPY --from=deps /app/services/early-years/node_modules ./services/early-years/node_modules
COPY --from=deps /app/services/linguaflow/node_modules ./services/linguaflow/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate --schema=packages/database/prisma/schema.prisma

# Build TypeScript
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 3: Production
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner

# Security: Run as non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 scholarly

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy package files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/packages/database/package.json ./packages/database/
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/validation/package.json ./packages/validation/
COPY --from=builder /app/services/early-years/package.json ./services/early-years/
COPY --from=builder /app/services/linguaflow/package.json ./services/linguaflow/
COPY --from=builder /app/apps/api/package.json ./apps/api/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy Prisma schema and generated client
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built application
COPY --from=builder /app/dist ./dist

# Set ownership to non-root user
RUN chown -R scholarly:nodejs /app

# Switch to non-root user
USER scholarly

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "dist/apps/api/src/server.js"]
