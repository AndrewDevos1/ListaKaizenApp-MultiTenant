# Fase 0: Setup do Repositorio (Monorepo)

## Repositorio

**URL:** `https://github.com/AndrewDevos1/ListaKaizenApp-MultiTenant.git`

## Estrutura do Monorepo com Turborepo

```
ListaKaizenApp-MultiTenant/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/        # Feature modules (auth, items, listas, etc.)
│   │   │   ├── common/         # Guards, decorators, filters, pipes
│   │   │   ├── prisma/         # Prisma module/service
│   │   │   ├── app.module.ts   # Root module
│   │   │   └── main.ts         # Entry point
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Schema do banco
│   │   │   └── seed.ts         # Seed de dados iniciais
│   │   ├── test/               # Testes e2e
│   │   ├── .env                # Variaveis locais (nao commitado)
│   │   └── package.json
│   │
│   └── web/                    # Next.js frontend
│       ├── src/
│       │   ├── app/            # App Router (pages e layouts)
│       │   ├── components/     # Componentes compartilhados
│       │   ├── features/       # Modulos por feature
│       │   ├── lib/            # API client, utils, helpers
│       │   ├── contexts/       # React contexts (Auth, Theme, etc.)
│       │   └── hooks/          # Custom hooks
│       ├── public/             # Assets estaticos
│       ├── .env.local          # Variaveis locais (nao commitado)
│       └── package.json
│
├── packages/
│   └── shared/                 # Types e enums compartilhados
│       ├── src/
│       │   ├── types/          # DTOs e interfaces (UserDto, ItemDto, etc.)
│       │   ├── enums/          # UserRole, PedidoStatus, etc.
│       │   └── index.ts        # Re-exports
│       ├── tsconfig.json
│       └── package.json
│
├── turbo.json                  # Config do Turborepo
├── package.json                # Root package.json (workspaces)
├── .gitignore
├── .env.example                # Template de variaveis
└── README.md
```

## Passo a Passo do Setup

### 1. Clonar e Inicializar

```bash
# Clonar o repo
git clone https://github.com/AndrewDevos1/ListaKaizenApp-MultiTenant.git
cd ListaKaizenApp-MultiTenant

# Inicializar com npm workspaces
npm init -y

# Instalar Turborepo
npm install turbo --save-dev
```

### 2. Configurar package.json raiz

```json
{
  "name": "lista-kaizen-multi-tenant",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "db:push": "cd apps/api && npx prisma db push",
    "db:migrate": "cd apps/api && npx prisma migrate dev",
    "db:seed": "cd apps/api && npx prisma db seed",
    "db:studio": "cd apps/api && npx prisma studio"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

### 3. Configurar turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"]
    },
    "lint": {}
  }
}
```

### 4. Criar NestJS App

```bash
mkdir -p apps
cd apps

# Gerar projeto NestJS
npx @nestjs/cli new api --package-manager npm --skip-git

cd api

# Prisma
npm install @prisma/client
npm install prisma --save-dev
npx prisma init

# Auth
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install -D @types/passport-jwt

# Validacao
npm install class-validator class-transformer

# Seguranca
npm install bcrypt
npm install -D @types/bcrypt

# Swagger (documentacao automatica da API)
npm install @nestjs/swagger

# Config
npm install @nestjs/config
```

### 5. Criar Next.js App

```bash
cd ../  # volta para apps/

npx create-next-app@latest web --typescript --app --tailwind --eslint --src-dir

cd web

# HTTP client
npm install axios

# UI Components (opcao recomendada)
npx shadcn@latest init
# Ou manter React Bootstrap:
# npm install react-bootstrap bootstrap

# Icons
npm install lucide-react
# Ou manter FontAwesome:
# npm install @fortawesome/fontawesome-svg-core @fortawesome/free-solid-svg-icons @fortawesome/react-fontawesome
```

### 6. Criar Package Shared

```bash
cd ../../  # volta para raiz
mkdir -p packages/shared/src/types packages/shared/src/enums

# packages/shared/package.json
cat > packages/shared/package.json << 'EOF'
{
  "name": "@kaizen/shared",
  "version": "1.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "echo 'no lint configured'"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
EOF

# packages/shared/tsconfig.json
cat > packages/shared/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
EOF
```

### 7. Configurar .env.example

```bash
cat > .env.example << 'EOF'
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/kaizen_multi_tenant"

# JWT
JWT_SECRET="sua-chave-secreta-aqui"
JWT_EXPIRES_IN="7d"

# API
API_PORT=3001

# Frontend
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
EOF
```

### 8. Configurar .gitignore

```bash
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Build
dist/
.next/
out/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Turbo
.turbo/

# Prisma
apps/api/prisma/*.db
EOF
```

## Verificacao da Fase 0

Apos completar o setup:

1. `npm install` na raiz funciona sem erros
2. `npm run dev` inicia ambos apps (NestJS na porta 3001, Next.js na porta 3000)
3. NestJS responde em `http://localhost:3001` com mensagem default
4. Next.js responde em `http://localhost:3000` com pagina default
5. `npx prisma studio` abre o Prisma Studio (sem tabelas ainda)
6. Commit inicial feito no repo

## Proxima Fase

-> `02_AUTH_MULTI_TENANT.md` - Implementar autenticacao e multi-tenant
