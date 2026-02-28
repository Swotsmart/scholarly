FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src/ ./src/
COPY server.ts ./
RUN npx tsc && npx tsc --outDir dist-server --rootDir . server.ts
RUN npm prune --production

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 chekd
COPY --from=builder /app/dist/ ./dist/
COPY --from=builder /app/dist-server/server.js ./
COPY --from=builder /app/node_modules/ ./node_modules/
COPY --from=builder /app/package.json ./
RUN chown -R chekd:nodejs /app
USER chekd
ENV NODE_ENV=production
ENV UC_PORT=3100
ENV UC_WS_PORT=3101
EXPOSE 3100 3101
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3100/health || exit 1
CMD ["node", "server.js"]
