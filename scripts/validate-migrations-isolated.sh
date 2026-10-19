#!/usr/bin/env bash
set -euo pipefail

# Bootstrap exact baseline schema in a task-owned PostgreSQL container, then prove migrate deploy.
ROOT=$(git rev-parse --show-toplevel)
API="$ROOT/apps/api"
BASELINE_REF="${BASELINE_REF:-c8a87ef}"
NAME="lista-kaizen-pr16-pg"
PASSWORD="$(openssl rand -hex 24)"
BASELINE_FILE="$(mktemp)"
trap 'rm -f "$BASELINE_FILE"; docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT

if docker ps -a --filter "name=^/${NAME}$" --format '{{.Names}}' | grep -qx "$NAME"; then
  echo "container reservado já existe: $NAME" >&2
  exit 1
fi

git show "$BASELINE_REF:apps/api/prisma/schema.prisma" > "$BASELINE_FILE"
docker run -d --rm --name "$NAME" \
  --label lista-kaizen.disposable=true \
  --label lista-kaizen.pr=16 \
  -e POSTGRES_PASSWORD="$PASSWORD" \
  -e POSTGRES_DB=lista_kaizen \
  -p 127.0.0.1::5432 postgres:16-alpine >/dev/null

for _ in $(seq 1 60); do
  PORT=$(docker port "$NAME" 5432/tcp 2>/dev/null | sed -E 's/.*:([0-9]+)$/\1/' || true)
  if [ -n "$PORT" ] && docker exec "$NAME" pg_isready -U postgres -d lista_kaizen >/dev/null 2>&1; then break; fi
  sleep 1
done
: "${PORT:?PostgreSQL descartável não iniciou}"
printf -v DATABASE_URL 'postgresql://postgres:%s@127.0.0.1:%s/lista_kaizen?schema=public' "$PASSWORD" "$PORT"
export DATABASE_URL

# The baseline is generated from a committed Prisma schema, never hand-written.
pushd "$API" >/dev/null
npx prisma migrate diff --from-empty --to-schema-datamodel "$BASELINE_FILE" --script > "$BASELINE_FILE.sql"
npx prisma db execute --url "$DATABASE_URL" --file "$BASELINE_FILE.sql"
for migration in \
  20261018000000_add_restaurante_modules \
  20261018010000_add_registros_ponto \
  20261018020000_add_classificacoes_ausencia \
  20261018020000_add_escalas_trabalho \
  20261018030000_add_lancamentos_banco_horas \
  20261018040000_add_atestados; do
  npx prisma migrate resolve --applied "$migration"
done
npx prisma migrate deploy
npx prisma migrate status
popd >/dev/null

# Assert migration-owned invariants and tenant isolation at the database boundary.
PGPASSWORD="$PASSWORD" psql "postgresql://postgres:${PASSWORD}@127.0.0.1:${PORT}/lista_kaizen" -v ON_ERROR_STOP=1 <<'SQL'
INSERT INTO "restaurantes" ("nome") VALUES ('tenant-a'), ('tenant-b');
INSERT INTO "usuarios" ("nome", "email", "senha", "restaurante_id", "aprovado")
VALUES ('u-a', 'pr16-a@example.invalid', 'x', 1, true), ('u-b', 'pr16-b@example.invalid', 'x', 2, true);
INSERT INTO "atestados" ("usuario_id", "restaurante_id", "inicio", "fim", "motivo", "criado_por_id", "atualizado_em", "solicitacao_hash")
VALUES (1, 1, DATE '2026-01-01', DATE '2026-01-01', 'isolamento', 1, CURRENT_TIMESTAMP, repeat('a', 64));
DO $$ BEGIN
  IF (SELECT count(*) FROM "atestados" WHERE "restaurante_id" = 2) <> 0 THEN
    RAISE EXCEPTION 'cross-tenant leak';
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'atestados'::regclass
      AND conname = 'atestados_horas_check'
      AND convalidated
  ) THEN
    RAISE EXCEPTION 'hours check missing or not validated';
  END IF;
  IF EXISTS (SELECT 1 FROM "atestados" WHERE "situacao" = 'APROVADO') THEN
    RAISE EXCEPTION 'historical ATIVO rows were approved automatically';
  END IF;
END $$;
SQL

echo "PASS: baseline verificável + migrate deploy + invariantes PostgreSQL isolado"
