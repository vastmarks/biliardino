#!/bin/sh
# Container start: check the settings, apply database migrations, start the app.
set -e

fail() {
  echo "ERROR: $1" >&2
  exit 1
}

[ "${#ADMIN_PASSWORD}" -ge 8 ] || fail "ADMIN_PASSWORD must be set and at least 8 characters long."
[ "${#NEXTAUTH_SECRET}" -ge 16 ] || fail "NEXTAUTH_SECRET must be set and at least 16 characters long (e.g. openssl rand -base64 32)."

db_file="${DATABASE_URL#file:}"
db_dir="$(dirname "$db_file")"
mkdir -p "$db_dir" 2>/dev/null || true
if ! touch "$db_dir/.write-test" 2>/dev/null; then
  fail "The data folder $db_dir is not writable for user $(id -u):$(id -g). Give that user write access to the folder you mounted (e.g. chown $(id -u):$(id -g) <folder>) or set 'user:' in the compose file to the folder's owner."
fi
rm -f "$db_dir/.write-test"

echo "Applying database migrations..."
prisma migrate deploy

echo "Starting Hilde on port ${PORT}..."
exec node server.js
