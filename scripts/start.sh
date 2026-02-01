#!/bin/sh
set -e

echo "Starting Scholarly Platform..."

# Run Prisma migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  echo "Running database migrations..."
  cd /app/packages/database
  npx prisma migrate deploy || echo "Migration failed or no migrations to run"
  cd /app
fi

# Start API server in background
echo "Starting API server on port 3001..."
cd /app/packages/api
node dist/index.js &
API_PID=$!

# Wait for API to be ready
sleep 3

# Start Next.js web server
echo "Starting Web server on port 3000..."
cd /app/packages/web
exec node server.js
