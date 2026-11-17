#!/usr/bin/env bash
# Smoke RH em banco descartavel LIMPO: DB novo -> migrate deploy -> seed -> tenant B -> API -> smoke 2x (idempotencia).
# Nao toca bancos existentes. Requer docker, node, python3. Env: SMOKE_PASSWORD (senha do seed).
set -euo pipefail
cd "$(dirname "$0")/.."
: "${SMOKE_PASSWORD:?defina SMOKE_PASSWORD (senha do seed)}"
N=kaizen-smoke-$$; PGP=${SMOKE_DB_PORT:-55480}; AP=${SMOKE_API_PORT:-3022}
cleanup(){ [ -n "${APID:-}" ] && kill $APID 2>/dev/null || true; docker rm -f $N >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run -d --name $N --label owner=kaizen-smoke -e POSTGRES_PASSWORD=smoke -e POSTGRES_DB=kaizen_smoke_test -p 127.0.0.1:$PGP:5432 postgres:16-alpine >/dev/null
until docker exec $N pg_isready -U postgres -d kaizen_smoke_test >/dev/null 2>&1; do sleep 1; done; sleep 2
export DATABASE_URL="postgresql://postgres:smoke@127.0.0.1:$PGP/kaizen_smoke_test?schema=public"
case "$DATABASE_URL" in *_test*) ;; *) echo "recusado: banco sem _test"; exit 2;; esac
npx prisma migrate deploy >/dev/null
npx ts-node prisma/seed.ts >/dev/null
Q(){ docker exec $N psql -U postgres kaizen_smoke_test -qAtc "$1"; }
Q "update restaurantes set modulo_ponto=true where id=1"
Q "insert into restaurantes(nome,modulo_ponto,modulo_funcionarios) values ('Restaurante B',true,true)"
Q "insert into usuarios(nome,email,username,senha,role,aprovado,ativo,restaurante_id) select 'Admin B','adminb@demo.com','adminb_demo',senha,'ADMIN',true,true,2 from usuarios where email='admin@demo.com'"
Q "insert into usuarios(nome,email,username,senha,role,aprovado,ativo,restaurante_id) select 'Colab B','colabb@demo.com','colabb_demo',senha,'COLLABORATOR',true,true,2 from usuarios where email='colab1@demo.com'"
PORT=$AP NODE_ENV=development JWT_SECRET=smoke-only-secret CORS_ORIGINS=http://localhost:3023 node dist/src/main.js >/tmp/smoke-api.$$.log 2>&1 & APID=$!
for i in $(seq 1 30); do curl -s -o /dev/null localhost:$AP/api/v1/auth/profile && break; sleep 1; done
export SMOKE_BASE=http://localhost:$AP/api/v1
echo "=== rodada 1 (banco limpo)"; python3 scripts/smoke_rh.py
echo "=== rodada 2 (mesmo banco, idempotencia)"; python3 scripts/smoke_rh.py
