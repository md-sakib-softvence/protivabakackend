#!/bin/bash
set -e

# Construct DATABASE_URL if missing or host is localhost (from Docker context)
DB_HOST=${POSTGRES_HOST:-db}
DB_PORT=${POSTGRES_PORT:-5432}

if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${DB_HOST}:${DB_PORT}/${POSTGRES_DB}?schema=public"
  echo "⚠️ DATABASE_URL was missing, constructed: $DATABASE_URL"
elif [[ "$DATABASE_URL" == *"localhost"* ]]; then
  # Automatically fix localhost -> db for Docker internal network
  export DATABASE_URL=$(echo $DATABASE_URL | sed "s/localhost/$DB_HOST/" | sed "s/127.0.0.1/$DB_HOST/")
  echo "🔄 Auto-fixed DATABASE_URL for Docker internal network: $DATABASE_URL"
fi

# Wait for DB if not skipping
if [ "$SKIP_DB_WAIT" != "true" ]; then
  echo "⏳ Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
  until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$POSTGRES_USER"; do
    sleep 2
  done
  echo "✅ PostgreSQL is ready!"
fi

# Perform Prisma operations
echo "📦 Running Prisma Migrations..."
npx prisma migrate deploy --config prisma/prisma.config.ts

echo "🌱 Seeding Database..."
npx prisma db seed --config prisma/prisma.config.ts

# Starting API
echo "🚀 Starting API..."
if [ -f dist/src/main.js ]; then
  exec node dist/src/main.js
elif [ -f dist/main.js ]; then
  exec node dist/main.js
else
  echo "❌ Error: API entrypoint (dist/main.js or dist/src/main.js) not found!"
  exit 1
fi
