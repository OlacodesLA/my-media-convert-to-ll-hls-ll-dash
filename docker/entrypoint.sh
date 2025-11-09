#!/bin/sh
set -e

# Ensure Prisma has up-to-date client and schema migrations
if [ -n "$RUN_DB_MIGRATIONS" ]; then
  if [ -z "$DATABASE_URL" ]; then
    echo "Skipping Prisma migrations because DATABASE_URL is not set."
  else
    echo "Running Prisma migrations..."
    npx prisma migrate deploy
  fi
fi

exec "$@"

