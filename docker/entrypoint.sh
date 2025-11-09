#!/bin/sh
set -e

# Ensure Prisma has up-to-date client and schema migrations
if [ -n "$RUN_DB_MIGRATIONS" ]; then
  echo "Running Prisma migrations..."
  npx prisma migrate deploy
fi

exec "$@"

