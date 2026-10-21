# Runbook de Deploy Railway — ListaKaizenApp MultiTenant

## Objetivo
Padronizar o deploy da API no Railway e reduzir incidentes de indisponibilidade, crash loop e falsos diagnósticos de CORS.

## Arquitetura de Deploy (API)
```text
GitHub (branch conectada no Railway)
        |
        v
Railway detecta push
        |
        v
BUILD (Nixpacks/Railpack)
  - npm ci --include=dev
  - prisma generate && nest build
        |
        v
DEPLOY
  - node apps/api/dist/src/main.js
  - app escuta em 0.0.0.0:${PORT}
        |
        v
NETWORKING (Railway Proxy)
  - domínio público -> target port (3001)
```

## Configuração Recomendada no Railway (API)

### Source
- Branch conectada: manter explícita (`railway` ou `main`).
- Se usar `railway`, sincronizar sempre:
```bash
git push origin main:railway
```

### Build
- Builder: padrão Railway.
- Build Command:
```bash
npm run build --workspace=api
```

### Deploy
- Start Command:
```bash
node apps/api/dist/src/main.js
```
- Nunca usar `prisma db push` no start command.

### Networking
- Target Port: `3001`
- Variável `PORT`: `3001` (deve casar com Target Port)

### Variables obrigatórias
- `PORT=3001`
- `DATABASE_URL=postgresql://...`
- `JWT_SECRET=<valor seguro>`
- `NODE_ENV=production`
- `CORS_ORIGINS=https://gestao-kaizen.up.railway.app`

## Checklist Pré-Deploy
- [ ] `npm run build --workspace=api` executa sem erro localmente.
- [ ] Build gera `apps/api/dist/src/main.js`.
- [ ] `schema.prisma` representa tabelas reais do banco (inclusive tabelas customizadas).
- [ ] `package-lock.json` atualizado após qualquer mudança de dependência.
- [ ] Commit correto está na branch que o Railway observa.

## Checklist Pós-Deploy
- [ ] Logs incluem `Nest application successfully started`.
- [ ] Logs incluem `API running on http://0.0.0.0:3001`.
- [ ] `curl https://gestao-kaizen-back.up.railway.app/api/docs` retorna `200`.
- [ ] Login funciona no frontend.

## Diagnóstico Rápido (SRE)

### Regra 1: “CORS + 502” quase sempre é backend down
Se navegador mostrar:
- `CORS Missing Allow Origin` e status `502`

Tratar como indisponibilidade da API, não como bug de CORS.

Validar direto:
```bash
curl -i -X OPTIONS 'https://gestao-kaizen-back.up.railway.app/api/v1/auth/login' \
  -H 'Origin: https://gestao-kaizen.up.railway.app' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type'
```
Se vier `502 Application failed to respond`, o problema é boot/runtime do backend.

### Regra 2: comparar PORT x Target Port
Se app sobe mas responde 502:
- conferir `PORT` em Variables
- conferir Target Port em Networking
- ambos devem ser `3001`

### Regra 3: crash loop por `db push` no startup
Nunca rodar `prisma db push` no start.  
Migração deve ser manual/pre-deploy controlado.

### Regra 4: erro de path de build
Se ocorrer:
`Cannot find module '/app/apps/api/dist/main'`

Causa: path errado.  
Correto para este projeto: `apps/api/dist/src/main.js`.

## Erros Reincidentes e Prevenção

### 1) Port mismatch
**Sintoma:** 502 com `x-railway-fallback: true`.  
**Prevenção:** `PORT` e Target Port iguais.

### 2) “CORS Missing Allow Origin” com 502
**Sintoma:** browser acusa CORS.  
**Prevenção:** sempre checar saúde da API primeiro (`/api/docs`).

### 3) `nest: not found` no build
**Causa:** dependências de build ausentes no ambiente.  
**Prevenção:** build command estável + lockfile atualizado + install com dev deps quando necessário.

### 4) `prisma db push` quebrando startup
**Causa:** data-loss warning em produção.  
**Prevenção:** retirar do startup e mapear todas as tabelas no schema.

### 5) branch errada no Railway
**Sintoma:** push não vira deploy.  
**Prevenção:** confirmar branch conectada em Source.

### 6) lockfile desatualizado
**Sintoma:** dependências não refletem package.json.  
**Prevenção:** rodar `npm install` e commitar `package-lock.json`.

## Comandos Operacionais

### Teste de saúde
```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  https://gestao-kaizen-back.up.railway.app/api/docs
```

### Verificar saída real do build
```bash
ls -la apps/api/dist
find apps/api/dist -maxdepth 3 -type f | head -n 30
```

### Build local de validação
```bash
npm run build --workspace=apps/api
node apps/api/dist/src/main.js
```

### Sincronizar branch `railway` com `main`
```bash
git push origin main:railway
```

## Procedimento de Incidente (playbook curto)
1. Confirmar status de `/api/docs`.
2. Se `502`, abrir logs do último deploy.
3. Validar commit ativo no deploy.
4. Validar Build/Start commands.
5. Validar `PORT` e Target Port.
6. Forçar redeploy com clear cache.
7. Revalidar `/api/docs` e só então testar login.
