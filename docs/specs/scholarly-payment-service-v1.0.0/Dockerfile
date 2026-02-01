# ============================================================================
# SCHOLARLY PAYMENT SERVICE - DOCKERFILE
# ============================================================================
# Multi-stage build for production-ready container
# ============================================================================

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S scholarly && \
    adduser -S scholarly -u 1001

# Copy built artifacts
COPY --from=builder --chown=scholarly:scholarly /app/dist ./dist
COPY --from=builder --chown=scholarly:scholarly /app/node_modules ./node_modules
COPY --from=builder --chown=scholarly:scholarly /app/package*.json ./
COPY --from=builder --chown=scholarly:scholarly /app/prisma ./prisma

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Switch to non-root user
USER scholarly

# Start application
CMD ["node", "dist/index.js"]
