# ============================================================================
# Érudits Platform — Production Dockerfile
# ============================================================================
#
# Multi-stage build:
#   Stage 1 (builder): Install all deps, compile TypeScript
#   Stage 2 (runner):  Slim image with only production deps + compiled JS
#
# The final image is ~250MB vs ~1.2GB with dev dependencies included.
# Think of it as packing only what you need for a business trip vs
# bringing your entire wardrobe.
#
# Usage:
#   docker build -t erudits-api .
#   docker run -p 3000:3000 --env-file .env erudits-api
# ============================================================================

# ── Stage 1: Build ──
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules (sharp, bcrypt)
RUN apk add --no-cache python3 make g++ vips-dev

# Copy package files first for layer caching
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies for compilation)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src/

# Compile TypeScript
RUN npx tsc -p tsconfig.build.json

# ── Stage 2: Production ──
FROM node:20-alpine AS runner

WORKDIR /app

# Install runtime dependencies for sharp (image processing) and Puppeteer
RUN apk add --no-cache \
    vips \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dumb-init

# Tell Puppeteer to use the installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production \
    PORT=3000

# Copy package files and install production-only deps
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && npx prisma generate

# Copy compiled JavaScript from builder
COPY --from=builder /app/dist ./dist/

# Create non-root user for security
RUN addgroup -g 1001 -S erudits && \
    adduser -S erudits -u 1001 -G erudits

USER erudits

EXPOSE 3000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Use dumb-init to handle PID 1 properly (signal forwarding)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
