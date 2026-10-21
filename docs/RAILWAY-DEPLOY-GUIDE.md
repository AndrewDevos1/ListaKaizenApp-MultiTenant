# Guia de Deploy Railway — ListaKaizenApp MultiTenant

## Arquitetura do Deploy

```
GitHub (branch: railway)
        │
        ▼
   Railway detecta push
        │
        ▼
┌─────────────────────────────────┐
│  BUILD (Nixpacks)               │
│  1. npm ci --include=dev        │  ← nixpacks.toml
│  2. prisma generate && nest build │  ← apps/api/package.json
│  3. Gera imagem Docker          │
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│  DEPLOY                         │
│  node apps/api/dist/src/main.js │  ← railway.json
│  Porta: PORT env var (3001)     │
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│  NETWORKING (Railway Proxy)     │
│  gestao-kaizen-back.up.railway.app │
│  Target port: 3001              │
│  Encaminha HTTPS → porta 3001   │
└─────────────────────────────────┘
```

## Checklist de Deploy

### Antes de fazer push

- [ ] `npm run build` funciona localmente em `apps/api/`
- [ ] `node dist/src/main.js` inicia sem erros (testar em `apps/api/`)
- [ ] Schema do Prisma reflete todas as tabelas do banco (`prisma db pull` para verificar)
- [ ] `package-lock.json` está atualizado (rodar `npm install` após mudar dependências)

### Após fazer push para branch `railway`

- [ ] Railway detectou o push e iniciou o build
- [ ] Build Logs mostram `npm ci --include=dev` (não `npm ci` sozinho)
- [ ] Build Logs mostram `prisma generate && nest build` sem erros
- [ ] Deploy Logs mostram `Nest application successfully started`
- [ ] Deploy Logs mostram `API running on http://0.0.0.0:3001`
- [ ] `curl https://gestao-kaizen-back.up.railway.app/api/docs` retorna 200

---

## Erros que enfrentamos e como evitar

### 1. PORT MISMATCH (causa: 502 silencioso)

**Sintoma:** App inicia com sucesso nos logs mas retorna 502 em todas as requests.
Header `x-railway-fallback: true` no response.

**Causa:** Railway Networking tinha target port = 3001, mas o PORT auto-injetado
pelo Railway era 8080. O app escutava em 8080, o proxy encaminhava para 3001.

**Fix:** Adicionar `PORT=3001` nas variáveis do serviço para sobrescrever o
valor auto-injetado e casar com o target port.

**Prevenção:**
- Sempre verificar que `PORT` (em Variables) = target port (em Settings → Networking)
- Se mudar um, mudar o outro
- Os logs devem mostrar `API running on http://0.0.0.0:3001` (mesma porta do target)

### 2. CORS Missing Allow Origin (sintoma, não causa)

**Sintoma:** Browser mostra "CORS Missing Allow Origin" e status 502.

**Causa:** NUNCA é CORS quando o status é 502. O 502 vem do Railway (proxy),
não do NestJS. O proxy não adiciona headers CORS, então o browser reporta como
erro de CORS. A causa real é o backend estar fora do ar.

**Prevenção:**
- Se vir CORS + 502: ignorar o CORS, investigar por que o backend está down
- Testar diretamente: `curl https://gestao-kaizen-back.up.railway.app/api/docs`
- Se o curl retorna 502, o problema é infraestrutura, não código

### 3. `nest: not found` no build (causa: devDependencies não instaladas)

**Sintoma:** Build falha com `sh: 1: nest: not found` (exit code 127).

**Causa:** Railway roda com `NODE_ENV=production`, fazendo `npm ci` pular
devDependencies. `@nestjs/cli` e `typescript` estavam em devDependencies.

**Fix:** Movidos para `dependencies` em `apps/api/package.json`.
Adicionado `nixpacks.toml` com `npm ci --include=dev` como fallback.

**Prevenção:**
- Ferramentas necessárias para BUILD devem estar em `dependencies`, não `devDependencies`
- Isso inclui: `@nestjs/cli`, `typescript`, e qualquer CLI usado no script de build
- `prisma` é exceção: `@prisma/client` (dep regular) já embute o binário desde v5

### 4. `prisma db push` no startup crashava o container

**Sintoma:** Container em crash loop. Logs mostram
`Error: Use the --accept-data-loss flag`.

**Causa:** `prisma db push` era executado no startup e tentava dropar tabelas
que não estavam no schema.

**Fix:** Removido `prisma db push` do startup. Tabelas mapeadas no schema.

**Prevenção:**
- NUNCA rodar `prisma db push` ou `prisma migrate` no startup de produção
- Migrações devem ser feitas manualmente ou via pre-deploy command do Railway
- Toda tabela criada manualmente no banco DEVE ser adicionada ao schema.prisma

### 5. Path do build incorreto (MODULE_NOT_FOUND)

**Sintoma:** `Error: Cannot find module '/app/apps/api/dist/main'`

**Causa:** NestJS gera output em `dist/src/main.js` (não `dist/main.js`).
Start script apontava para o path errado.

**Fix:** Start command corrigido para `node apps/api/dist/src/main.js`.

**Prevenção:**
- Após alterar configuração do NestJS/TypeScript, verificar onde o build gera os arquivos
- Rodar `ls apps/api/dist/` após build para confirmar a estrutura

### 6. Branch errada no Railway

**Sintoma:** Push para `main` não triggerava deploy. Railway continuava com código antigo.

**Causa:** Railway estava configurado para deploy da branch `railway`, não `main`.

**Fix:** `git push origin main:railway` para sincronizar.

**Prevenção:**
- Railway Settings → Source → verificar qual branch está conectada
- Manter branch `railway` sincronizada: `git push origin main:railway`
- Ou mudar Railway para apontar direto para `main`

### 7. package-lock.json desatualizado

**Sintoma:** `npm ci` instala o mesmo número de pacotes mesmo após mudar
package.json. Binários esperados não estão disponíveis.

**Causa:** `npm ci` usa o lockfile de forma estrita. Se o lockfile não reflete
as mudanças no package.json, as novas dependências não são instaladas.

**Fix:** Rodar `npm install` localmente para regenerar o lockfile, depois commitar.

**Prevenção:**
- Sempre rodar `npm install` após mover/adicionar/remover dependências
- Commitar o `package-lock.json` atualizado junto com o `package.json`

---

## Variáveis de Ambiente (Railway)

| Variável | Valor | Obrigatório |
|---|---|---|
| `PORT` | `3001` | Sim — deve casar com target port |
| `DATABASE_URL` | `postgresql://...` | Sim |
| `JWT_SECRET` | (string segura) | Sim |
| `JWT_EXPIRATION` | `7d` | Não (default: 7d) |
| `NODE_ENV` | `production` | Sim |
| `CORS_ORIGINS` | `https://gestao-kaizen.up.railway.app` | Sim |

## Arquivos de Configuração

| Arquivo | Função |
|---|---|
| `railway.json` | Define build command, start command, restart policy |
| `nixpacks.toml` | Força `npm ci --include=dev` no install |
| `apps/api/package.json` | Build: `prisma generate && nest build` |
| `apps/api/prisma/schema.prisma` | Schema do banco — deve refletir TODAS as tabelas |

## Comandos Úteis

```bash
# Testar se backend está vivo
curl -s -o /dev/null -w "%{http_code}" https://gestao-kaizen-back.up.railway.app/api/docs

# Sincronizar branch railway com main
git push origin main:railway

# Verificar banco de produção
psql "$DATABASE_URL" -c "\dt"

# Build local para testar
cd apps/api && npm run build && node dist/src/main.js
```
