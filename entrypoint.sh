#!/bin/sh
set -e

# Fail early with a readable message instead of a half-working app
: "${ADMIN_PASSWORD:?ADMIN_PASSWORD must be set (min. 8 characters)}"
: "${NEXTAUTH_SECRET:?NEXTAUTH_SECRET must be set (min. 16 characters)}"
: "${NEXTAUTH_URL:?NEXTAUTH_URL must be set (public URL of the app, e.g. http://localhost:3000)}"

echo "Applying database migrations..."
prisma migrate deploy

echo "Starting Hilde..."
exec node server.js
