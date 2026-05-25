#!/bin/sh
echo "[START] Running Prisma migrations..."
node node_modules/prisma/build/index.js migrate deploy 2>&1 || echo "[START] Prisma migration failed or skipped"
echo "[START] Starting Node.js server..."
exec node dist/server.js
