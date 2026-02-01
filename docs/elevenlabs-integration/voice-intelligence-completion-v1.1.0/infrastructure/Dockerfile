# =============================================================================
# Voice Intelligence Service — Dockerfile
# =============================================================================
#
# Multi-stage build for the Voice Intelligence Service. Uses a builder stage
# to compile TypeScript and install dependencies, then copies only the
# production artifacts into a slim runtime image. This keeps the final image
# small (~200MB vs ~800MB) and reduces the attack surface.
#
# Build:  docker build -t scholarly/voice-intelligence:latest .
# Run:    docker run -p 3000:3000 -p 3001:3001 scholarly/voice-intelligence:latest
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Builder — compile TypeScript and install all dependencies
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for layer caching
# (dependencies change less often than source code)
COPY package.json package-lock.json tsconfig.json ./
COPY prisma/ prisma/

# Install all dependencies including devDependencies (needed for tsc)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY src/ src/

# Compile TypeScript
RUN npm run build

# Remove devDependencies after compilation
RUN npm prune --production

# ---------------------------------------------------------------------------
# Stage 2: Runtime — minimal image with only production artifacts
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runtime

# Security: run as non-root user
RUN addgroup -g 1001 -S scholarly && \
    adduser -S scholarly -u 1001 -G scholarly

WORKDIR /app

# Install runtime system dependencies
# - tini: proper init process for signal handling in containers
# - dumb-init alternative is also acceptable
RUN apk add --no-cache tini

# Copy production node_modules
COPY --from=builder /app/node_modules ./node_modules

# Copy compiled JavaScript
COPY --from=builder /app/dist ./dist

# Copy Prisma artifacts (client + schema)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Copy package.json for runtime metadata
COPY package.json ./

# Set ownership
RUN chown -R scholarly:scholarly /app

USER scholarly

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# HTTP API port
EXPOSE 3000

# WebSocket port (can be same as HTTP if using upgrade on same server)
EXPOSE 3001

# Health check — verify the service is responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Environment variable defaults
ENV NODE_ENV=production \
    PORT=3000 \
    WS_PORT=3001 \
    LOG_LEVEL=info \
    # Database
    DATABASE_URL="" \
    # Redis
    REDIS_URL="" \
    # NATS
    NATS_URL="" \
    # ElevenLabs
    ELEVENLABS_API_KEY="" \
    ELEVENLABS_AGENT_API_KEY="" \
    # Service limits
    MAX_SESSIONS_PER_TENANT=50 \
    MAX_SESSION_DURATION_MS=1800000 \
    # Observability
    OTEL_EXPORTER_OTLP_ENDPOINT="" \
    OTEL_SERVICE_NAME=voice-intelligence

# Use tini as init process for proper signal handling
# This ensures SIGTERM is forwarded to the Node process for graceful shutdown
ENTRYPOINT ["/sbin/tini", "--"]

# Start the service
CMD ["node", "dist/server.js"]
