#!/usr/bin/env bash
# Regressão: migrate deploy em Postgres novo/descartável + zero drift vs schema.prisma.
set -euo pipefail
cd "$(dirname "$0")/.."
N=kaizen-mig_test-$$; P=${MIG_PORT:-55462}
trap 'docker rm -fv $N >/dev/null 2>&1' EXIT
docker run -d --name $N --label owner=kaizen-mig-test -e POSTGRES_PASSWORD=migtest -e POSTGRES_DB=mig_test -p 127.0.0.1:$P:5432 postgres:16-alpine >/dev/null
until docker exec $N pg_isready -U postgres -d mig_test >/dev/null 2>&1; do sleep 1; done; sleep 2
export DATABASE_URL="postgresql://postgres:migtest@127.0.0.1:$P/mig_test?schema=public"
npx prisma migrate deploy
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code
echo "OK: migrate deploy do zero sem drift"
