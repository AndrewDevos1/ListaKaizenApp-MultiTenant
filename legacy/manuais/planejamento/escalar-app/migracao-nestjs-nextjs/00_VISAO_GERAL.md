# Plano de Migracao: NestJS + Next.js + Prisma

## Contexto

O projeto ListaKaizenApp atual (Flask + React) esta funcional em producao com:

| Metrica | Quantidade |
|---------|-----------|
| Modelos backend | 43 |
| Endpoints API | 265 |
| Service functions | 200+ |
| Componentes frontend | 84 features + 19 shared |
| Rotas frontend | 70+ |
| Contextos React | 4 |

A migracao para NestJS + Next.js + Prisma e motivada por:
- **Produtividade**: TypeScript full-stack (frontend ja e TS, backend passa a ser tambem)
- **Arquitetura futura**: Microservices, real-time com WebSockets, filas asincronas
- **Aprendizado/Portfolio**: Stack moderna e muito valorizada no mercado

## Decisoes Tecnicas

| Decisao | Escolha | Justificativa |
|---------|---------|---------------|
| ORM | **Prisma** | TypeScript-first, schema declarativo, migrations automaticas |
| Banco | **PostgreSQL novo** | Schema limpo, sem heranca de 61 migrations |
| Frontend | **Next.js App Router** | SSR/SSG, layouts, melhor DX |
| CSS | **Tailwind + shadcn/ui** (sugerido) | Mais moderno que React Bootstrap |
| Monorepo | **Turborepo** | Compartilhar types entre api e web |
| 1a Feature | **Listas + Itens** | Base para todo o sistema |

## Estrategia

- **Repo separado**: `https://github.com/AndrewDevos1/ListaKaizenApp-MultiTenant.git`
- **Migracao gradual**: Feature por feature, sem pressa
- **App atual intocado**: Continua rodando em producao sem alteracoes
- **Banco separado**: Novo PostgreSQL com schema limpo desenhado para Prisma

## Roadmap

```
Fase 0: Setup monorepo Turborepo            [1-2 dias]
Fase 1: Auth + Multi-Tenant NestJS           [3-5 dias]
Fase 2: Listas + Itens (full-stack)          [5-7 dias]
Fase 3: Estoque + Submissoes                 [5-7 dias]
Fase 4: Fornecedores + Cotacoes              [5-7 dias]
Fase 5: POP + Checklists + Extras            [7-10 dias]
Fase 6: Features novas (WebSockets, etc.)    [ongoing]
```

**Total estimado ate paridade:** ~4-6 semanas de trabalho ativo.

## Indice dos Documentos

| Arquivo | Conteudo |
|---------|----------|
| `01_SETUP_MONOREPO.md` | Fase 0 - Estrutura do repositorio e setup |
| `02_AUTH_MULTI_TENANT.md` | Fase 1 - Autenticacao, JWT, Guards, Multi-Tenant |
| `03_LISTAS_ITENS.md` | Fase 2 - Primeira feature completa (backend + frontend) |
| `04_ESTOQUE_SUBMISSOES.md` | Fase 3 - Core business: estoque e submissoes |
| `05_FORNECEDORES_COTACOES.md` | Fase 4 - Portal fornecedor e cotacoes |
| `06_FEATURES_AVANCADAS.md` | Fase 5 - POP, checklists, listas rapidas, notificacoes |
| `07_FEATURES_NOVAS.md` | Fase 6 - Features que o app atual nao tem |
| `08_MIGRACAO_DADOS.md` | Estrategia para migrar dados e fazer o switch |
| `09_INVENTARIO_ATUAL.md` | Referencia completa do projeto atual (modelos, endpoints, etc.) |

## O Que Fazer com o App Atual

1. **Manter rodando** em producao sem alteracoes
2. **Nao fazer merge** entre os repos
3. Quando o novo app atingir paridade, fazer **migracao de dados** (script PostgreSQL -> PostgreSQL)
4. Redirect DNS do dominio antigo para o novo
5. Manter app antigo em read-only por 30 dias como fallback
