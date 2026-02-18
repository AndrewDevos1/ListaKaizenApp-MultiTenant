# Manual: Migração de Design — ListaKaizenApp (Legacy → Next.js)

> **Branch:** `restaurando-design`
> **Objetivo:** Portar fielmente o design visual do app React legado (`legacy/frontend`) para o monorepo Next.js (`apps/web`) sem alterar lógica de negócio.

---

## 1. Diagnóstico — O que está errado atualmente

### 1.1 Bootstrap não está importado globalmente

O `apps/web/src/app/layout.tsx` importa apenas `globals.css`. O CSS do Bootstrap foi removido, mas **todas as páginas** usam componentes `react-bootstrap` (`Card`, `Table`, `Button`, `Modal`, `Form`, `Spinner`, `Alert`, `Badge`).

Esses componentes renderizam HTML semântico sem estilo próprio — dependem do Bootstrap CSS para funcionar. Sem ele, tabelas ficam sem bordas, botões sem aparência, modais sem z-index, etc.

**Solução:** Importar `bootstrap/dist/css/bootstrap.min.css` no `layout.tsx` **antes** do `globals.css`. Depois, sobrescrever as variáveis do Bootstrap com os design tokens do sistema.

---

### 1.2 Sidebar incompleta (não fiel ao legado)

A `Sidebar.tsx` atual é uma versão simplificada. Faltam:

| Elemento | Legado | Atual |
|---|---|---|
| Busca com atalho `/` | ✅ Input com filtro em tempo real | ❌ Ausente |
| Accordion por grupo | ✅ Grupos colapsáveis com preferência salva | ❌ Ausente |
| Navbar superior | ✅ Barra com ícone de hamburguer + breadcrumb | ❌ Ausente |
| UserAvatar com gradiente por role | ✅ Componente próprio | ❌ Ícone genérico |
| Ripple effect nos itens | ✅ Animação de clique | ❌ Ausente |
| Swipe gesture mobile | ✅ Touch start/end para abrir/fechar | ❌ Ausente |
| "Orelha" com texto "MENU" vertical | ✅ Texto rotacionado 90°, gradiente roxo | ❌ Ícone apenas |
| Footer com links | ✅ Versão v2.1.0, Ajuda, Configurações | ❌ Apenas toggle dark mode |
| Notificações (badge) | ✅ Badge com animação `pulse` | ❌ Ausente |
| Grupos do menu admin | 4 grupos completos | 2 grupos (incompleto) |

---

### 1.3 Páginas sem CSS Modules

Nenhuma página do Next.js tem um arquivo `.module.css` próprio. Todas usam apenas classes Bootstrap padrão. No legado, cada página tinha um CSS Module rico com:

- Cards animados com `slideUp` no carregamento
- Widget cards no dashboard com gradientes e barra lateral colorida
- Tabelas com header de gradiente roxo
- Grids responsivos com `auto-fill`
- Estados hover com `translateY`

---

### 1.4 Login/Register sem design glassmorphism

A página de login atual usa um `Card` Bootstrap padrão centralizado. O legado tinha:

- Fundo com gradiente animado (`gradientShift` 15s infinito)
- Bolhas decorativas com `float` animation
- Card com `border-radius: 20px`, `backdrop-filter: blur(10px)`
- Botão com gradiente, `text-transform: uppercase`
- Animação de entrada `slideIn 0.6s`

---

### 1.5 Home page sem design

A `apps/web/src/app/page.tsx` (redirect page) usa apenas `Spinner` e `Container` Bootstrap. Não existe uma home page estilizada equivalente à do legado.

---

## 2. Mapa de Arquivos — Legado vs. Next.js

### Arquivos a CRIAR no Next.js

| Arquivo a criar | Baseado no legado |
|---|---|
| `apps/web/src/app/globals.css` (substituir o atual) | `legacy/frontend/src/index.css` |
| `apps/web/src/components/Sidebar.tsx` (reescrever) | `legacy/frontend/src/components/Layout.tsx` |
| `apps/web/src/components/Sidebar.module.css` (reescrever) | `legacy/frontend/src/components/Layout.module.css` |
| `apps/web/src/components/UserAvatar.tsx` | `legacy/frontend/src/components/UserAvatar.tsx` |
| `apps/web/src/components/UserAvatar.module.css` | `legacy/frontend/src/components/UserAvatar.module.css` |
| `apps/web/src/app/login/Login.module.css` | `legacy/frontend/src/features/auth/Login.module.css` |
| `apps/web/src/app/admin/dashboard/Dashboard.module.css` | `legacy/frontend/src/features/admin/AdminDashboard.module.css` |
| `apps/web/src/app/collaborator/dashboard/Dashboard.module.css` | `legacy/frontend/src/features/collaborator/CollaboratorDashboard.module.css` |
| `apps/web/src/app/admin/items/Items.module.css` | (baseado em `CatalogoGlobal.module.css` + padrão geral) |
| `apps/web/src/app/admin/areas/Areas.module.css` | (padrão geral das páginas admin) |
| `apps/web/src/app/admin/listas/Listas.module.css` | `legacy/frontend/src/features/admin/ListasCompras.module.css` |
| `apps/web/src/app/admin/listas/[id]/ListaDetail.module.css` | `legacy/frontend/src/features/admin/GerenciarItensLista.module.css` |
| `apps/web/src/app/collaborator/listas/Listas.module.css` | `legacy/frontend/src/features/collaborator/MinhasListasCompras.module.css` |

### Arquivos a MODIFICAR no Next.js

| Arquivo | O que muda |
|---|---|
| `apps/web/src/app/layout.tsx` | Importar Bootstrap CSS antes do globals.css |
| `apps/web/src/app/login/page.tsx` | Aplicar classes do Login.module.css |
| `apps/web/src/app/admin/dashboard/page.tsx` | Reescrever para usar widget cards estilizados |
| `apps/web/src/app/collaborator/dashboard/page.tsx` | Reescrever para usar widget cards estilizados |
| `apps/web/src/app/admin/items/page.tsx` | Aplicar classes do Items.module.css |
| `apps/web/src/app/admin/areas/page.tsx` | Aplicar classes do Areas.module.css |
| `apps/web/src/app/admin/listas/page.tsx` | Aplicar classes do Listas.module.css |
| `apps/web/src/app/admin/listas/[id]/page.tsx` | Aplicar classes do ListaDetail.module.css |
| `apps/web/src/app/collaborator/listas/page.tsx` | Aplicar classes do Listas.module.css |

---

## 3. Plano de Implementação — Passo a Passo

### Passo 1 — Corrigir globals.css (Design Tokens completos)

**Arquivo:** `apps/web/src/app/globals.css`

Substituir o arquivo atual pelo port fiel do `legacy/frontend/src/index.css`, adicionando:

1. **Todos os tokens de status** que faltam:
   ```css
   --status-success-bg, --status-success-subtle-bg, --status-success-soft-bg,
   --status-success-faint-bg, --status-success-text, --status-success-accent,
   --status-success-accent-strong, --status-warning-*, --status-danger-*,
   --status-info-*, --surface-muted, --border-subtle, --table-header-bg,
   --table-row-hover, --icon-muted, --input-bg, --input-text,
   --input-placeholder, --input-border, --link-color, --link-hover-color
   ```

2. **Dark mode completo** com overrides para componentes Bootstrap:
   ```css
   [data-theme='dark'] .card { background-color: var(--bg-secondary); border-color: var(--border-color); }
   [data-theme='dark'] .table { color: var(--text-primary); }
   [data-theme='dark'] .form-control { background-color: var(--input-bg); color: var(--input-text); border-color: var(--input-border); }
   [data-theme='dark'] .modal-content { background-color: var(--bg-secondary); }
   [data-theme='dark'] .modal-header { border-color: var(--border-color); }
   ```

3. **Override de variáveis Bootstrap** para alinhar ao sistema de design:
   ```css
   :root {
     --bs-primary: #667eea;
     --bs-primary-rgb: 102, 126, 234;
     --bs-body-bg: var(--bg-primary);
     --bs-body-color: var(--text-primary);
     --bs-border-color: var(--border-color);
     --bs-card-bg: var(--bg-secondary);
   }
   ```

**Referência:** `legacy/frontend/src/index.css` (189 linhas)

---

### Passo 2 — Importar Bootstrap no layout.tsx

**Arquivo:** `apps/web/src/app/layout.tsx`

```tsx
// ANTES:
import './globals.css';

// DEPOIS (ordem importa):
import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
```

O `globals.css` deve vir **depois** do Bootstrap para que os overrides de variáveis CSS funcionem corretamente.

---

### Passo 3 — Reescrever Sidebar completa

**Arquivo:** `apps/web/src/components/Sidebar.tsx`

Port fiel do `legacy/frontend/src/components/Layout.tsx` (508 linhas) adaptado para Next.js:

#### 3.1 Estados a implementar:
```tsx
const [isToggled, setIsToggled] = useState(false);      // off-canvas mobile
const [isCollapsed, setIsCollapsed] = useState(false);   // collapse desktop (localStorage)
const [searchTerm, setSearchTerm] = useState('');        // busca em tempo real
const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({}); // accordion
const [isDark, setIsDark] = useState(false);             // dark mode (localStorage)
```

#### 3.2 Efeitos a implementar:
```tsx
// Collapse: persistir no localStorage
useEffect(() => {
  const saved = localStorage.getItem('sidebarCollapsed') === 'true';
  setIsCollapsed(saved);
}, []);

// Dark mode: aplicar data-theme no <html>
useEffect(() => {
  const theme = localStorage.getItem('theme') || 'light';
  setIsDark(theme === 'dark');
  document.documentElement.setAttribute('data-theme', theme);
}, []);

// Tecla Escape para fechar mobile
// Tecla "/" para focar busca
// Resize para resetar collapsed no mobile
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setIsToggled(false);
    if (e.key === '/' && !isToggled) { e.preventDefault(); searchRef.current?.focus(); }
  };
  const handleResize = () => { if (window.innerWidth <= 768) setIsCollapsed(false); };
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('resize', handleResize);
  return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('resize', handleResize); };
}, [isToggled]);
```

#### 3.3 Swipe gesture (mobile):
```tsx
const touchStartX = useRef(0);
const handleTouchStart = (e: TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
const handleTouchEnd = (e: TouchEvent) => {
  const diff = touchStartX.current - e.changedTouches[0].clientX;
  if (diff > 50) setIsToggled(false);   // swipe left → fecha
  if (diff < -50) setIsToggled(true);   // swipe right → abre
};
```

#### 3.4 Menu groups completos (Admin):
```tsx
const adminMenuGroups = [
  {
    id: 'visao-geral', label: 'VISÃO GERAL',
    items: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: FaTachometerAlt },
    ]
  },
  {
    id: 'gestao', label: 'GESTÃO',
    items: [
      { label: 'Itens', href: '/admin/items', icon: FaBoxes },
      { label: 'Áreas', href: '/admin/areas', icon: FaMapMarkerAlt },
      { label: 'Listas', href: '/admin/listas', icon: FaList },
    ]
  },
  {
    id: 'conta', label: 'CONTA',
    items: [
      { label: 'Sair', href: null, icon: FaSignOutAlt, action: logout },
    ]
  }
];
```

#### 3.5 Estrutura JSX fiel:
```tsx
<div className={`${styles.wrapper} ${isToggled ? styles.toggled : ''} ${isCollapsed ? styles.collapsed : ''}`}>
  {/* Overlay mobile */}
  <div className={styles.overlay} onClick={() => setIsToggled(false)} />

  {/* Sidebar */}
  <nav className={styles.sidebarWrapper} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

    {/* Header: logo + botão collapse */}
    <div className={styles.sidebarHeader}>
      <span className={styles.sidebarHeading}>Kaizen</span>
      <button className={styles.collapseButton} onClick={toggleCollapse}>
        <FaChevronRight />
      </button>
    </div>

    {/* User Profile */}
    <div className={styles.userProfileSection}>
      <UserAvatar user={user} size="medium" />
      <div className={styles.userInfo}>
        <div className={styles.userName}>{user.nome}</div>
        <div className={styles.userRole}>{isAdmin ? 'Administrador' : 'Colaborador'}</div>
      </div>
    </div>

    {/* Busca */}
    <div className={styles.searchContainer}>
      <FaSearch />
      <input
        ref={searchRef}
        className={styles.searchInput}
        placeholder='Buscar... (/)'
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />
      {searchTerm && <button className={styles.searchClear} onClick={() => setSearchTerm('')}><FaTimes /></button>}
    </div>

    {/* Menu */}
    <div className={styles.menuContainer}>
      {filteredGroups.map(group => (
        <div key={group.id} className={styles.menuGroup}>
          <button
            className={styles.menuGroupTitle}
            onClick={() => toggleGroup(group.id)}
          >
            {group.label}
            <FaChevronRight className={expandedGroups[group.id] ? styles.rotated : ''} />
          </button>
          {expandedGroups[group.id] && (
            <div className={styles.menuGroupItems}>
              {group.items.map(item => (/* item JSX */)}
            </div>
          )}
        </div>
      ))}
    </div>

    {/* Footer */}
    <div className={styles.sidebarFooter}>
      <button className={styles.darkModeToggle} onClick={toggleDark}>
        {isDark ? <FaSun /> : <FaMoon />}
        <span>{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>
      </button>
      <span className={styles.footerVersion}>v2.1.0</span>
    </div>
  </nav>

  {/* Conteúdo */}
  <div className={styles.pageContentWrapper}>
    {children}
  </div>

  {/* "Orelha" flutuante mobile */}
  <button className={styles.sidebarTab} onClick={() => setIsToggled(true)}>
    <FaBars />
    <span>MENU</span>
  </button>
</div>
```

**Referência:** `legacy/frontend/src/components/Layout.tsx` (508 linhas)

---

### Passo 4 — Reescrever Sidebar.module.css completo

**Arquivo:** `apps/web/src/components/Sidebar.module.css`

Port fiel do `legacy/frontend/src/components/Layout.module.css` (823 linhas). Pontos críticos:

#### 4.1 Wrapper e layout:
```css
.wrapper {
  display: flex;
  position: relative;
  min-height: 100vh;
  background: var(--bg-primary);
}

/* Desktop: sidebar sempre visível à direita */
@media (min-width: 769px) {
  .sidebarWrapper { position: fixed; right: 0; width: 18rem; }
  .wrapper.collapsed .sidebarWrapper { width: 5rem; }
  .pageContentWrapper { margin-right: 18rem; }
  .wrapper.collapsed .pageContentWrapper { margin-right: 5rem; }
}

/* Mobile: off-canvas */
@media (max-width: 768px) {
  .sidebarWrapper { position: fixed; right: 0; width: 280px; margin-right: -280px; }
  .wrapper.toggled .sidebarWrapper { margin-right: 0; }
  .pageContentWrapper { margin-right: 0; }
}
```

#### 4.2 Sidebar background:
```css
.sidebarWrapper {
  background: linear-gradient(180deg, #2c3e50 0%, #34495e 100%);
  height: 100vh;
  top: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1),
              margin-right 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  overflow-y: auto;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
}
```

#### 4.3 Item de menu ativo e hover:
```css
.listGroupItem {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1.5rem;
  color: #cbd5e0;
  border-right: 3px solid transparent;
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  text-decoration: none;
  min-height: 48px;
  position: relative;
  overflow: hidden;
}

.listGroupItem:hover {
  color: #ffffff;
  background-color: rgba(255, 255, 255, 0.08);
  transform: translateX(-4px);
  border-right-color: rgba(13, 110, 253, 0.5);
}

.listGroupItem.active {
  background: linear-gradient(270deg, rgba(13,110,253,0.25) 0%, rgba(13,110,253,0.05) 100%);
  border-right-color: #0d6efd;
  color: #ffffff;
  font-weight: 600;
}

/* Ripple effect */
.listGroupItem::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
}
.listGroupItem:active::after { opacity: 1; }
```

#### 4.4 "Orelha" mobile com texto vertical:
```css
.sidebarTab {
  display: none;
  position: fixed;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 120px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px 0 0 8px;
  color: white;
  cursor: pointer;
  z-index: 998;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 1px;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  transform: translateY(-50%) rotate(180deg);
  box-shadow: -2px 0 12px rgba(102, 126, 234, 0.4);
  transition: width 0.3s ease;
}
.sidebarTab:hover { width: 56px; }

@media (max-width: 768px) {
  .sidebarTab { display: flex; }
  .wrapper.toggled .sidebarTab { display: none; }
}
```

#### 4.5 Accordion de grupos:
```css
.menuGroupTitle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.5rem 1.25rem;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 1px;
  color: rgba(255,255,255,0.4);
  text-transform: uppercase;
  background: none;
  border: none;
  cursor: pointer;
}
.menuGroupTitle .chevron { transition: transform 0.25s; }
.menuGroupTitle .chevron.rotated { transform: rotate(90deg); }
```

#### 4.6 Busca:
```css
.searchContainer {
  position: relative;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.searchInput {
  width: 100%;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  color: #fff;
  padding: 0.5rem 2rem 0.5rem 2.5rem;
  font-size: 0.85rem;
}
.searchInput::placeholder { color: rgba(255,255,255,0.35); }
.searchInput:focus { background: rgba(255,255,255,0.14); outline: none; border-color: rgba(255,255,255,0.3); }
```

#### 4.7 Collapsed state — apenas ícones:
```css
.wrapper.collapsed .sidebarHeading,
.wrapper.collapsed .userInfo,
.wrapper.collapsed .searchContainer,
.wrapper.collapsed .menuGroupTitle span,
.wrapper.collapsed .listGroupItem span,
.wrapper.collapsed .sidebarFooter span,
.wrapper.collapsed .footerVersion { display: none; }

.wrapper.collapsed .listGroupItem {
  justify-content: center;
  padding: 0.875rem 0;
}
```

**Referência:** `legacy/frontend/src/components/Layout.module.css` (823 linhas)

---

### Passo 5 — Criar UserAvatar component

**Arquivo:** `apps/web/src/components/UserAvatar.tsx`
**Arquivo:** `apps/web/src/components/UserAvatar.module.css`

```tsx
// UserAvatar.tsx
interface Props {
  user: { nome: string; role: string };
  size?: 'small' | 'medium' | 'large';
}

export default function UserAvatar({ user, size = 'medium' }: Props) {
  const initials = user.nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className={`${styles.avatar} ${styles[size]} ${styles[user.role.toLowerCase()]}`}>
      {initials}
    </div>
  );
}
```

```css
/* UserAvatar.module.css */
.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}
.small { width: 32px; height: 32px; font-size: 0.75rem; }
.medium { width: 40px; height: 40px; font-size: 0.9rem; }
.large { width: 56px; height: 56px; font-size: 1.2rem; }

/* Gradiente por role */
.admin { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.super_admin { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.collaborator { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
```

---

### Passo 6 — Login page com glassmorphism

**Arquivo:** `apps/web/src/app/login/Login.module.css`

Port do `legacy/frontend/src/features/auth/Login.module.css` (435 linhas):

```css
/* Fundo com gradiente animado */
.loginWrapper {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

/* Bolhas decorativas */
.loginWrapper::before {
  content: '';
  position: absolute;
  top: -100px; right: -100px;
  width: 500px; height: 500px;
  background: rgba(255,255,255,0.1);
  border-radius: 50%;
  animation: float 20s infinite ease-in-out;
}
.loginWrapper::after {
  content: '';
  position: absolute;
  bottom: -150px; left: -100px;
  width: 400px; height: 400px;
  background: rgba(255,255,255,0.07);
  border-radius: 50%;
  animation: float 25s infinite ease-in-out reverse;
}

/* Card glassmorphism */
.loginCard {
  background: rgba(255,255,255,0.98);
  border-radius: 20px;
  padding: 2.5rem;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  backdrop-filter: blur(10px);
  animation: slideIn 0.6s ease-out;
  position: relative;
  z-index: 1;
}

/* Botão com gradiente */
.loginButton {
  width: 100%;
  padding: 0.875rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 10px;
  color: white;
  font-weight: 600;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102,126,234,0.4);
}
.loginButton:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(102,126,234,0.5); }
.loginButton:disabled { opacity: 0.7; cursor: not-allowed; }

/* Inputs */
.formInput {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e0e6ed;
  border-radius: 10px;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  background: #fff;
}
.formInput:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102,126,234,0.1);
  transform: translateY(-2px);
}

/* Keyframes */
@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
@keyframes float {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  33% { transform: translate(30px, -50px) rotate(5deg); }
  66% { transform: translate(-20px, 20px) rotate(-3deg); }
}
@keyframes slideIn {
  from { opacity: 0; transform: translateY(-30px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
```

Modificar `apps/web/src/app/login/page.tsx` para usar as classes do module.

---

### Passo 7 — Dashboard Admin com widget cards

**Arquivo:** `apps/web/src/app/admin/dashboard/Dashboard.module.css`

Port do `legacy/frontend/src/features/admin/AdminDashboard.module.css` (604 linhas):

```css
.dashboardWrapper {
  background: var(--bg-primary, #f0f3f8);
  min-height: 100vh;
  padding: 2rem 0;
}

/* Widget cards em grid */
.widgetsGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.widgetCard {
  background: var(--bg-secondary, #fff);
  border-radius: 15px;
  padding: 1.75rem;
  box-shadow: var(--card-shadow);
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  animation: slideUp 0.5s ease-out backwards;
}
.widgetCard:nth-child(1) { animation-delay: 0.1s; }
.widgetCard:nth-child(2) { animation-delay: 0.2s; }
.widgetCard:nth-child(3) { animation-delay: 0.3s; }

/* Barra lateral colorida */
.widgetCard::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 5px;
  background: var(--widget-color, #667eea);
  border-radius: 15px 0 0 15px;
}

.widgetCard:hover { transform: translateY(-8px); box-shadow: var(--card-shadow-hover); }

/* Variantes de widget */
.widgetBlue { --widget-color: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.widgetGreen { --widget-color: linear-gradient(135deg, #2eb85c 0%, #1e8449 100%); }
.widgetYellow { --widget-color: linear-gradient(135deg, #ffc107 0%, #ff9800 100%); }

/* Ícone do widget */
.widgetIcon {
  width: 60px; height: 60px;
  border-radius: 12px;
  background: var(--widget-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  color: white;
  margin-bottom: 1rem;
}

/* Valor principal do widget */
.widgetValue { font-size: 2.25rem; font-weight: 700; color: var(--text-primary); }
.widgetTitle { font-size: 0.9rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }

@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
```

Modificar `apps/web/src/app/admin/dashboard/page.tsx` para usar os widget cards estilizados.

---

### Passo 8 — Páginas Admin com CSS Modules

#### 8.1 Items (`/admin/items`)

**Arquivo:** `apps/web/src/app/admin/items/Items.module.css`

Padrão: página com header (título + botão adicionar), tabela com responsividade (tabela no desktop, cards no mobile).

```css
.pageWrapper { background: var(--bg-primary); min-height: 100vh; padding: 2rem 0; }
.pageHeader { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.pageTitle { font-size: 2rem; font-weight: 700; color: var(--text-primary); }
.tableWrapper { background: var(--bg-secondary); border-radius: 12px; box-shadow: var(--card-shadow); overflow: hidden; }
.tableHeader { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
/* Desktop: tabela | Mobile: cards */
.cardsMobile { display: none; }
@media (max-width: 768px) {
  .tableDesktop { display: none; }
  .cardsMobile { display: block; }
}
```

#### 8.2 Áreas (`/admin/areas`)

**Arquivo:** `apps/web/src/app/admin/areas/Areas.module.css`

Mesmo padrão que Items.

#### 8.3 Listas (`/admin/listas`)

**Arquivo:** `apps/web/src/app/admin/listas/Listas.module.css`

Port do `ListasCompras.module.css` (376 linhas) — grid de cards:
```css
.listasGrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 2rem; }
.listaCard { border-radius: 15px; animation: slideUp 0.5s ease-out backwards; }
.cardCriar { border: 3px dashed #2eb85c; background: linear-gradient(135deg, #f0fff4, #e6f7ed); }
.cardLista { border-left: 5px solid #f9b115; }
```

#### 8.4 Detalhe de Lista (`/admin/listas/[id]`)

**Arquivo:** `apps/web/src/app/admin/listas/[id]/ListaDetail.module.css`

Port do `GerenciarItensLista.module.css` (239 linhas):
```css
.container { background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); }
.tableHeader { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
.statsCard:hover { transform: translateY(-4px); }
```

---

### Passo 9 — Dashboard e Listas do Colaborador

#### 9.1 Dashboard Collaborator

**Arquivo:** `apps/web/src/app/collaborator/dashboard/Dashboard.module.css`

Idêntico ao Admin Dashboard (mesmo arquivo do legado — `CollaboratorDashboard.module.css` = cópia do `AdminDashboard.module.css`).

Modificar `apps/web/src/app/collaborator/dashboard/page.tsx` para mostrar:
- Widget de boas-vindas com nome do usuário
- Widget de listas atribuídas (count)
- Grid de links rápidos

#### 9.2 Minhas Listas (Collaborator)

**Arquivo:** `apps/web/src/app/collaborator/listas/Listas.module.css`

Port do `MinhasListasCompras.module.css` (157 linhas):
```css
.container { background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); }
.listaCard { border-radius: 12px; }
.listaCard:hover { transform: translateY(-6px); }
```

---

## 4. Ordem de Execução Recomendada

Execute os passos nesta ordem para ter feedback visual progressivo:

```
1. globals.css     → Tokens + Bootstrap override (base de tudo)
2. layout.tsx      → Importar Bootstrap CSS (ativa componentes)
3. Sidebar.module.css → CSS completo fiel ao legado (layout principal)
4. Sidebar.tsx     → Lógica completa (busca, accordion, swipe)
5. UserAvatar.tsx  → Componente avatar (usado na sidebar)
6. login/page.tsx  → Login.module.css + aplicar classes (página mais visível)
7. admin/dashboard → Dashboard.module.css + widget cards
8. collaborator/dashboard → Mesmo padrão
9. admin/items     → Items.module.css + aplicar classes
10. admin/areas    → Areas.module.css + aplicar classes
11. admin/listas   → Listas.module.css + aplicar classes
12. admin/listas/[id] → ListaDetail.module.css + aplicar classes
13. collaborator/listas → Listas.module.css + aplicar classes
```

---

## 5. Verificação — Checklist de Qualidade

### Visual
- [ ] Fundo da página: `#f0f3f8` (não branco)
- [ ] Sidebar: gradiente `#2c3e50 → #34495e`, fixa à direita
- [ ] Items de menu: hover desliza para esquerda (`translateX(-4px)`)
- [ ] Item ativo: borda direita `#0d6efd` + fundo gradiente azul suave
- [ ] "Orelha" mobile: gradiente roxo, texto "MENU" vertical
- [ ] Login: gradiente animado no fundo, card glassmorphism
- [ ] Dashboards: widget cards com barra lateral colorida, animação de entrada

### Funcional
- [ ] Sidebar colapsa no desktop (18rem → 5rem), persiste no localStorage
- [ ] Busca filtra itens do menu em tempo real, atalho `/` foca
- [ ] Accordion de grupos funciona, estado persiste
- [ ] Swipe abre/fecha sidebar no mobile
- [ ] Tecla `Escape` fecha sidebar mobile
- [ ] Dark mode toggle funciona, `data-theme='dark'` aplica em `<html>`
- [ ] Dark mode persiste no localStorage ao recarregar
- [ ] Logout redireciona para `/login`

### Dark Mode
- [ ] Fundo: `#1a1d23`
- [ ] Cards: `#2b3035`
- [ ] Texto: `#f8f9fa`
- [ ] Tabelas: fundo dark, bordas `#495057`
- [ ] Inputs: fundo dark, texto claro
- [ ] Modais: fundo dark

### Responsividade
- [ ] Mobile (< 768px): sidebar off-canvas, "orelha" visível
- [ ] Tablet (768px–992px): sidebar visível, sem colapso
- [ ] Desktop (> 992px): sidebar visível, botão colapso disponível
- [ ] Páginas com tabela: mostram cards no mobile

---

## 6. Referências de Arquivos no Legado

```
legacy/frontend/src/
├── index.css                                          ← globals.css base
├── components/
│   ├── Layout.tsx                                     ← Sidebar.tsx base
│   ├── Layout.module.css                              ← Sidebar.module.css base (823 linhas)
│   ├── UserAvatar.tsx                                 ← UserAvatar.tsx base
│   └── UserAvatar.module.css
├── features/
│   ├── auth/
│   │   └── Login.module.css                           ← Login.module.css base (435 linhas)
│   ├── admin/
│   │   ├── AdminDashboard.module.css                  ← Admin dashboard base (604 linhas)
│   │   ├── ListasCompras.module.css                   ← /admin/listas base (376 linhas)
│   │   ├── GerenciarItensLista.module.css             ← /admin/listas/[id] base (239 linhas)
│   │   └── CatalogoGlobal.module.css                  ← /admin/items base (114 linhas)
│   └── collaborator/
│       ├── CollaboratorDashboard.module.css           ← Collab dashboard base (604 linhas)
│       └── MinhasListasCompras.module.css             ← /collaborator/listas base (157 linhas)
```

---

## 7. Notas Técnicas Importantes

### Bootstrap x CSS Modules

Os dois sistemas **coexistem** sem conflito:
- Bootstrap é carregado globalmente (classes `btn`, `table`, `card`, etc. continuam funcionando)
- CSS Modules são escopados (classes únicas geradas automaticamente)
- O `globals.css` sobrescreve variáveis Bootstrap com `--bs-*` para unificar as cores

### CSS Aninhado (nesting)

O `globals.css` atual usa CSS nesting (`&:hover` dentro de seletores). Isso só funciona em navegadores modernos e Next.js 15 com PostCSS. Verificar se há suporte antes de usar em módulos.

### Animações e `prefers-reduced-motion`

Adicionar no `globals.css`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### `'use client'` nos layouts

Os layouts de admin e collaborator precisam de `'use client'` porque usam `Sidebar.tsx` que tem estado (React hooks). Isso já está correto.

### Font Awesome → react-icons

Todos os ícones do legado foram substituídos pela lib `react-icons/fa` já instalada no projeto. Tabela completa de equivalências no plano anterior.
