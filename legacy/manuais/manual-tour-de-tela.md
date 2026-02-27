# Manual de Replicação: Tour de Tela (Guided Tour)

Este manual documenta como replicar o sistema de "Tour de Tela" para qualquer aplicação React/Next.js.

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura](#2-arquitetura)
3. [Implementação Frontend](#3-implementação-frontend)
4. [Implementação Backend](#4-implementação-backend)
5. [Estilos CSS](#5-estilos-css)
6. [Integração com Menu/Sidebar](#6-integração-com-menusidebar)
7. [Checklist de Implementação](#7-checklist-de-implementação)
8. [Exemplos Completos](#8-exemplos-completos)

---

## 1. Visão Geral

### O que é?

Um sistema de tour guiado que orienta usuários em suas primeiras interações com a aplicação. O tour:

- **Aparece automaticamente** no primeiro acesso do usuário
- **Pode ser reiniciado** via botão no menu
- **Destaca elementos** da interface com overlay escuro + animação pulsante
- **Persiste o progresso** no banco de dados (sincronizado entre dispositivos)
- **Suporta múltiplos tours** independentes (ex: tour do dashboard, tour de criação)

### Características

| Recurso | Descrição |
|---------|-----------|
| **Sem dependências** | Implementação 100% nativa (sem React Joyride, Shepherd, etc.) |
| **Persistência dupla** | LocalStorage (resposta rápida) + Backend (sincronização) |
| **Versionamento** | Permite atualizar tours sem reexibir para quem já viu |
| **Responsivo** | Funciona em desktop e mobile |
| **Atalhos de teclado** | ESC para sair, ENTER para avançar |

---

## 2. Arquitetura

### Diagrama de Fluxo

```
┌─────────────────────────────────────────────────────────────┐
│                      PRIMEIRO ACESSO                        │
├─────────────────────────────────────────────────────────────┤
│  1. Usuário faz login                                       │
│  2. Frontend verifica wizardStatus do user                  │
│  3. Se tour não foi concluído → setMostrarWizard(true)     │
│  4. Renderiza Card com passos + overlay escuro             │
│  5. Elementos recebem classe .wizard-active (animação)     │
├─────────────────────────────────────────────────────────────┤
│                      NAVEGAÇÃO                              │
├─────────────────────────────────────────────────────────────┤
│  6. Usuário clica "Próximo" → wizardStep++                 │
│  7. useEffect atualiza data-wizard-step no <html>          │
│  8. CSS move o highlight para novo elemento                │
├─────────────────────────────────────────────────────────────┤
│                      CONCLUSÃO                              │
├─────────────────────────────────────────────────────────────┤
│  9. Usuário conclui ou pula o tour                         │
│  10. localStorage.setItem("wizard.tour.v1", "done")        │
│  11. PATCH /api/users/profile/wizard (persiste no banco)   │
│  12. setMostrarWizard(false)                               │
└─────────────────────────────────────────────────────────────┘
```

### Estrutura de Arquivos

```
seu-projeto/
├── frontend/
│   ├── app/
│   │   ├── globals.css              # Estilos do wizard
│   │   └── dashboard/
│   │       └── page.tsx             # Página com o tour
│   ├── components/
│   │   └── layout/
│   │       └── sidebar.tsx          # Botão "Tour" no menu
│   ├── contexts/
│   │   └── auth-context.tsx         # Expõe user.wizardStatus
│   └── lib/
│       └── api/
│           └── users.ts             # usersApi.updateWizardStatus()
│
└── backend/
    ├── src/
    │   ├── entities/
    │   │   └── User.ts              # Campo wizardStatus (JSONB)
    │   ├── database/
    │   │   └── migrations/
    │   │       └── AddWizardStatus.ts
    │   ├── services/
    │   │   └── user.service.ts      # updateWizardStatus()
    │   ├── controllers/
    │   │   └── user.controller.ts   # Endpoint handler
    │   └── routes/
    │       └── user.routes.ts       # PATCH /profile/wizard
```

---

## 3. Implementação Frontend

### 3.1. Estrutura de Dados do Tour

```typescript
// Tipos para o wizard
interface WizardAction {
  label: string
  href: string
  variant?: "outline" | "default"
}

interface WizardStep {
  key: string           // Identificador único (usado em data-wizard-target)
  title: string         // Título exibido no card
  description: string   // Descrição do passo
  actions?: WizardAction[]  // Botões de ação opcionais
}

// Estrutura salva no banco
interface WizardStatus {
  [tourName: string]: {
    version: number
    status: "completed" | "skipped"
    completed: boolean
    lastStep: number
    updatedAt: string
  }
}
```

### 3.2. Definição dos Passos

```typescript
// Constantes do tour
const WIZARD_VERSION = 1  // Incrementar para forçar reexibição

// Defina os passos do seu tour
const WIZARD_STEPS: WizardStep[] = [
  {
    key: "nav",
    title: "Barra de navegação",
    description: "Use o menu lateral para navegar entre as seções da aplicação.",
    actions: [
      { label: "Ver opções", href: "/dashboard", variant: "outline" },
    ],
  },
  {
    key: "dashboard",
    title: "Painel principal",
    description: "Aqui você encontra um resumo das suas atividades.",
    actions: [
      { label: "Explorar", href: "/dashboard/explorar" },
    ],
  },
  {
    key: "criar",
    title: "Criar novo item",
    description: "Clique aqui para criar um novo item no sistema.",
    actions: [
      { label: "Criar agora", href: "/dashboard/criar" },
    ],
  },
]
```

### 3.3. Componente Completo

```tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { usersApi } from "@/lib/api/users"

// Constantes
const WIZARD_VERSION = 1
const WIZARD_STORAGE_KEY = "wizard.meutour.v1"

// Passos do tour
const WIZARD_STEPS = [
  {
    key: "nav",
    title: "Barra de navegação",
    description: "Use o menu lateral para navegar entre as seções.",
    actions: [{ label: "Entendi", href: "#", variant: "outline" as const }],
  },
  {
    key: "dashboard",
    title: "Painel principal",
    description: "Aqui você encontra um resumo das suas atividades.",
    actions: [{ label: "Explorar", href: "/dashboard" }],
  },
  {
    key: "criar",
    title: "Criar novo item",
    description: "Clique aqui para criar um novo item no sistema.",
    actions: [{ label: "Criar agora", href: "/criar" }],
  },
]

export default function MinaPaginaComTour() {
  const { user } = useAuth()
  const router = useRouter()

  // Estados do wizard
  const [mostrarWizard, setMostrarWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(0)

  // Verificar se deve mostrar o tour no primeiro acesso
  useEffect(() => {
    const localDone = localStorage.getItem(WIZARD_STORAGE_KEY) === "done"
    const backendDone = user?.wizardStatus?.meuTour?.completed === true

    if (!localDone && !backendDone) {
      setMostrarWizard(true)
      setWizardStep(0)
    }
  }, [user])

  // Listener para reiniciar o tour via evento
  useEffect(() => {
    const handleStart = () => {
      setMostrarWizard(true)
      setWizardStep(0)
    }

    window.addEventListener("wizard-start", handleStart)
    return () => window.removeEventListener("wizard-start", handleStart)
  }, [])

  // Controlar highlights visuais
  useEffect(() => {
    const root = document.documentElement

    // Limpar highlights anteriores
    document.querySelectorAll(".wizard-active").forEach((el) => {
      el.classList.remove("wizard-active")
    })

    if (!mostrarWizard) {
      delete root.dataset.wizardStep
      return
    }

    const stepKey = WIZARD_STEPS[wizardStep]?.key
    if (!stepKey) {
      delete root.dataset.wizardStep
      return
    }

    // Definir passo atual no root (para CSS)
    root.dataset.wizardStep = stepKey

    // Encontrar e destacar elemento alvo
    const target = document.querySelector(`[data-wizard-target="${stepKey}"]`)
    if (target) {
      target.classList.add("wizard-active")
      target.scrollIntoView({ behavior: "smooth", block: "center" })
    }

    return () => {
      document.querySelectorAll(".wizard-active").forEach((el) => {
        el.classList.remove("wizard-active")
      })
    }
  }, [mostrarWizard, wizardStep])

  // Atalhos de teclado
  useEffect(() => {
    if (!mostrarWizard) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        handleWizardClose("skipped")
      } else if (e.key === "Enter") {
        e.preventDefault()
        if (wizardStep === WIZARD_STEPS.length - 1) {
          handleWizardClose("completed")
        } else {
          setWizardStep((prev) => prev + 1)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [mostrarWizard, wizardStep])

  // Persistir status no backend
  const persistWizardStatus = async (status: "completed" | "skipped") => {
    try {
      await usersApi.updateWizardStatus({
        meuTour: {
          version: WIZARD_VERSION,
          status,
          completed: status === "completed",
          lastStep: wizardStep,
          updatedAt: new Date().toISOString(),
        },
      })
    } catch (error) {
      console.error("Erro ao salvar status do wizard:", error)
    }
  }

  // Fechar wizard
  const handleWizardClose = (status: "completed" | "skipped") => {
    localStorage.setItem(WIZARD_STORAGE_KEY, "done")
    setMostrarWizard(false)
    persistWizardStatus(status)
  }

  // Variáveis derivadas
  const totalSteps = WIZARD_STEPS.length
  const isLastStep = wizardStep === totalSteps - 1
  const currentStep = WIZARD_STEPS[wizardStep]

  return (
    <div className="space-y-6">
      {/* Card do Wizard */}
      {mostrarWizard && (
        <Card className="border-dashed border-primary/30 bg-white shadow-sm relative z-[70]">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Tour rápido</CardTitle>
              <CardDescription>
                Passo {wizardStep + 1} de {totalSteps}
              </CardDescription>
            </div>
            <Button variant="ghost" onClick={() => handleWizardClose("skipped")}>
              Pular tour
            </Button>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Conteúdo do passo atual */}
            <div className="space-y-2">
              <Badge variant="secondary">Passo {wizardStep + 1}</Badge>
              <div>
                <p className="text-base font-semibold">{currentStep.title}</p>
                <p className="text-sm text-muted-foreground">
                  {currentStep.description}
                </p>
              </div>
            </div>

            {/* Botões de ação do passo */}
            {currentStep.actions && currentStep.actions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {currentStep.actions.map((action) => (
                  <Button
                    key={action.href}
                    size="sm"
                    variant={action.variant === "outline" ? "outline" : "default"}
                    onClick={() => {
                      if (action.href !== "#") router.push(action.href)
                    }}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}

            {/* Navegação entre passos */}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              {wizardStep > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setWizardStep((prev) => prev - 1)}
                >
                  Voltar
                </Button>
              )}
              {isLastStep ? (
                <Button onClick={() => handleWizardClose("completed")}>
                  Concluir
                </Button>
              ) : (
                <Button onClick={() => setWizardStep((prev) => prev + 1)}>
                  Próximo
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conteúdo da página com data-wizard-target */}
      <nav data-wizard-target="nav">
        {/* Seu menu/navegação */}
      </nav>

      <main data-wizard-target="dashboard">
        {/* Conteúdo principal */}
      </main>

      <button data-wizard-target="criar">
        Criar item
      </button>
    </div>
  )
}
```

### 3.4. API Client

```typescript
// lib/api/users.ts
import { api } from "@/lib/api"

export const usersApi = {
  // Atualizar status do wizard do usuário logado
  updateWizardStatus: async (
    wizardStatus: Record<string, any>
  ): Promise<{ wizardStatus: Record<string, any> }> => {
    const { data } = await api.patch('/api/users/profile/wizard', { wizardStatus })
    return data
  },
}
```

---

## 4. Implementação Backend

### 4.1. Entidade User (TypeORM)

```typescript
// entities/User.ts
import { Entity, Column, PrimaryGeneratedColumn } from "typeorm"

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column({ unique: true })
  email: string

  @Column()
  password: string

  // Campo para armazenar status do wizard
  @Column({
    name: 'wizard_status',
    type: 'jsonb',
    default: () => "'{}'"
  })
  wizardStatus: Record<string, any>

  // ... outros campos
}
```

### 4.2. Migração

```typescript
// migrations/XXXXXX-AddWizardStatusToUser.ts
import { MigrationInterface, QueryRunner } from "typeorm"

export class AddWizardStatusToUser1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "wizard_status" JSONB DEFAULT '{}'
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "wizard_status"
    `)
  }
}
```

### 4.3. Service

```typescript
// services/user.service.ts
import { AppDataSource } from "@/config/database"
import { User } from "@/entities/User"

export class UserService {
  private userRepository = AppDataSource.getRepository(User)

  async updateWizardStatus(
    userId: string,
    wizardStatus: Record<string, any>
  ): Promise<{ wizardStatus: Record<string, any> }> {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    })

    if (!user) {
      throw new Error("Usuário não encontrado")
    }

    // Mesclar com status existente (não sobrescrever outros tours)
    const currentStatus = user.wizardStatus || {}
    user.wizardStatus = { ...currentStatus, ...wizardStatus }

    await this.userRepository.save(user)

    return { wizardStatus: user.wizardStatus }
  }
}
```

### 4.4. Controller

```typescript
// controllers/user.controller.ts
import { Request, Response } from "express"
import { UserService } from "@/services/user.service"

interface AuthRequest extends Request {
  user?: { id: string }
}

export class UserController {
  private userService = new UserService()

  updateWizardStatus = async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({ message: "Não autorizado" })
      }

      const { wizardStatus } = req.body

      if (!wizardStatus || typeof wizardStatus !== "object") {
        return res.status(400).json({
          message: "wizardStatus deve ser um objeto"
        })
      }

      const result = await this.userService.updateWizardStatus(
        userId,
        wizardStatus
      )

      return res.json(result)
    } catch (error) {
      console.error("Erro ao atualizar wizard status:", error)
      return res.status(500).json({
        message: "Erro interno do servidor"
      })
    }
  }
}
```

### 4.5. Rota

```typescript
// routes/user.routes.ts
import { Router } from "express"
import { UserController } from "@/controllers/user.controller"
import { authenticate } from "@/middlewares/auth.middleware"

const router = Router()
const userController = new UserController()

// Rota para atualizar status do wizard
router.patch(
  '/users/profile/wizard',
  authenticate,
  userController.updateWizardStatus
)

export default router
```

### 4.6. Incluir wizardStatus no Login/Profile

```typescript
// services/auth.service.ts
async login(email: string, password: string) {
  const user = await this.userRepository.findOne({
    where: { email },
    select: ['id', 'name', 'email', 'role', 'wizardStatus'] // Incluir wizardStatus
  })

  // ... validação de senha

  return {
    token: jwt.sign({ id: user.id }, JWT_SECRET),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      wizardStatus: user.wizardStatus, // Retornar no login
    }
  }
}
```

---

## 5. Estilos CSS

Adicione os seguintes estilos ao seu arquivo CSS global:

```css
/* globals.css */

/* Animação de destaque pulsante */
@keyframes wizard-blink {
  0%,
  100% {
    box-shadow:
      0 0 0 2px rgba(37, 99, 235, 0.35),
      0 0 0 10px rgba(37, 99, 235, 0.0);
  }
  50% {
    box-shadow:
      0 0 0 2px rgba(37, 99, 235, 0.6),
      0 0 0 12px rgba(37, 99, 235, 0.2);
  }
}

/* Overlay escuro (spotlight) */
.wizard-spotlight {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  z-index: 50;
}

/* Ativar overlay quando wizard está ativo */
:root[data-wizard-step] .wizard-spotlight {
  opacity: 1;
}

/* Classe aplicada ao elemento destacado */
.wizard-active {
  position: relative;
  z-index: 60;
  animation: wizard-blink 1.6s ease-in-out infinite;
}

/* Opcional: Mostrar tooltips condicionais */
[data-wizard-tip] {
  display: none;
}

:root[data-wizard-step="nav"] [data-wizard-tip="nav"] {
  display: block;
}

:root[data-wizard-step="dashboard"] [data-wizard-tip="dashboard"] {
  display: block;
}
```

### Adicionar o Overlay no Layout

```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {/* Overlay do wizard */}
      <div className="wizard-spotlight" />

      {/* Resto do layout */}
      <Sidebar />
      <main>{children}</main>
    </div>
  )
}
```

---

## 6. Integração com Menu/Sidebar

### Botão para Reiniciar o Tour

```tsx
// components/layout/sidebar.tsx
export function Sidebar() {
  const handleStartTour = () => {
    // Disparar evento que o wizard escuta
    window.dispatchEvent(new Event("wizard-start"))
  }

  return (
    <aside data-wizard-target="nav">
      <nav>
        {/* Itens do menu */}
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/criar">Criar</Link>

        {/* Botão para reiniciar tour */}
        <button
          onClick={handleStartTour}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <HelpCircle className="h-4 w-4" />
          Tour da aplicação
        </button>
      </nav>
    </aside>
  )
}
```

### Marcar Elementos com data-wizard-target

```tsx
{/* Cada elemento que será destacado precisa de data-wizard-target */}
<aside data-wizard-target="nav">
  Menu lateral
</aside>

<div data-wizard-target="dashboard">
  Painel principal
</div>

<button data-wizard-target="criar">
  Criar novo item
</button>

<input data-wizard-target="busca" placeholder="Buscar..." />
```

---

## 7. Checklist de Implementação

### Backend

- [ ] Adicionar campo `wizardStatus` (JSONB) na entidade User
- [ ] Criar migração para adicionar a coluna
- [ ] Criar método `updateWizardStatus` no UserService
- [ ] Criar endpoint `PATCH /api/users/profile/wizard`
- [ ] Incluir `wizardStatus` no retorno do login e profile

### Frontend

- [ ] Criar constantes `WIZARD_VERSION` e `WIZARD_STEPS`
- [ ] Criar estados `mostrarWizard` e `wizardStep`
- [ ] Implementar useEffect para verificar primeiro acesso
- [ ] Implementar useEffect para event listener "wizard-start"
- [ ] Implementar useEffect para controlar highlights
- [ ] Implementar atalhos de teclado (ESC, ENTER)
- [ ] Criar função `persistWizardStatus`
- [ ] Criar função `handleWizardClose`
- [ ] Renderizar Card do wizard condicionalmente
- [ ] Adicionar `data-wizard-target` nos elementos

### CSS

- [ ] Adicionar animação `@keyframes wizard-blink`
- [ ] Adicionar classe `.wizard-spotlight`
- [ ] Adicionar regra `:root[data-wizard-step] .wizard-spotlight`
- [ ] Adicionar classe `.wizard-active`
- [ ] Adicionar `<div className="wizard-spotlight" />` no layout

### Menu/Sidebar

- [ ] Adicionar botão "Tour" que dispara `wizard-start`
- [ ] Adicionar `data-wizard-target="nav"` no container do menu

---

## 8. Exemplos Completos

### Exemplo: Tour com Passos Dinâmicos (baseado em permissões)

```typescript
const wizardSteps = useMemo(() => {
  const baseSteps = [
    { key: "nav", title: "Menu", description: "Navegue pela aplicação" },
    { key: "dashboard", title: "Dashboard", description: "Visão geral" },
  ]

  // Adicionar passo de admin apenas se for admin
  if (user?.role === "ADMIN") {
    baseSteps.push({
      key: "admin",
      title: "Administração",
      description: "Gerencie usuários e configurações",
    })
  }

  return baseSteps
}, [user?.role])
```

### Exemplo: Múltiplos Tours Independentes

```typescript
// Tour 1: Dashboard
const DASHBOARD_TOUR_KEY = "wizard.dashboard.v1"
const dashboardTourDone = user?.wizardStatus?.dashboardTour?.completed

// Tour 2: Criação de Item
const CRIAR_TOUR_KEY = "wizard.criar.v1"
const criarTourDone = user?.wizardStatus?.criarTour?.completed

// Cada tour é salvo separadamente no wizardStatus
await usersApi.updateWizardStatus({
  dashboardTour: { completed: true, ... },
  // criarTour permanece inalterado
})
```

### Exemplo: Forçar Reexibição (Nova Versão)

```typescript
// Incrementar versão quando quiser mostrar o tour novamente
const WIZARD_VERSION = 2  // Era 1, agora é 2

// Verificar versão salva vs versão atual
const savedVersion = user?.wizardStatus?.meuTour?.version || 0
const shouldShowTour = savedVersion < WIZARD_VERSION

if (shouldShowTour) {
  setMostrarWizard(true)
}
```

---

## Conclusão

Este sistema de tour de tela é uma implementação completa e robusta que não depende de bibliotecas externas. Ele oferece:

1. **Flexibilidade** - Fácil adicionar/remover passos
2. **Persistência** - Sincroniza entre dispositivos via backend
3. **Versionamento** - Permite atualizar tours sem incomodar usuários
4. **UX Profissional** - Animações suaves e destaque visual claro
5. **Acessibilidade** - Suporta navegação por teclado

Para dúvidas ou melhorias, consulte a implementação original em:
- Frontend: `frontend/app/dashboard/page.tsx`
- Backend: `backend/src/services/user.service.ts`
- CSS: `frontend/app/globals.css` (linhas 123-160)
