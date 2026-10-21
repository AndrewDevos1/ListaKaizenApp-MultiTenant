# 10 — Responsividade

> Sistema de design responsivo com 3 breakpoints, sidebar adaptativa, gestos touch e padrão mobile-card.

---

## Breakpoints

```
Mobile:   < 768px
Tablet:   768px – 991px
Desktop:  ≥ 992px
```

Definidos em:
- `frontend/src/styles/mobile.css` — ajustes globais (413 linhas)
- `frontend/src/components/Layout.module.css` — sidebar e layout (1477 linhas, ~80 media queries)

---

## Detecção de Breakpoint no React

```tsx
// frontend/src/components/Layout.tsx:651
const [isMobile, setIsMobile] = React.useState(() => window.innerWidth < 768);

// Listener de resize:
React.useEffect(() => {
  const handleResize = () => {
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    if (!mobile) {
      setIsMobileCollapsed(true);
    }
  };
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

---

## Sidebar Adaptativa

### Estados

| Dispositivo | Estado padrão | Comportamento |
|-------------|---------------|---------------|
| Desktop | Expandida | `isCollapsed` persiste em `localStorage('sidebarCollapsed')` |
| Desktop | Recolhida | Ícones apenas, sem labels |
| Mobile | Oculta (`isMobileCollapsed=true`) | Overlay escuro ao abrir |

```tsx
// Lógica unificada de collapse:
const isMenuCollapsed = isMobile ? isMobileCollapsed : isCollapsed;
```

### Abrir/Fechar no Mobile

- **Botão hamburger** (topbar mobile): `setIsToggled(!isToggled); setIsMobileCollapsed(false)`
- **Overlay click**: fecha o sidebar
- **Swipe para direita** (gesto touch): fecha o sidebar se aberto
- **Swipe da borda direita** (edge ≥ `window.innerWidth - 50`): abre o sidebar

### CSS Classes no Wrapper Principal

```tsx
// Layout.tsx:1730
<div className={`d-flex
  ${isToggled ? styles.toggled : ''}
  ${isMenuCollapsed ? styles.collapsed : ''}
  ${styles.wrapper}`}
>
```

---

## Gestos Touch (Swipe)

**Arquivo:** `frontend/src/components/Layout.tsx:1683`

```tsx
const minSwipeDistance = 50; // pixels mínimos para considerar swipe

const onTouchStart = (e: React.TouchEvent) => {
  setTouchEnd(null);
  setTouchStart(e.targetTouches[0].clientX);
};

const onTouchMove = (e: React.TouchEvent) => {
  setTouchEnd(e.targetTouches[0].clientX);
};

const onTouchEnd = () => {
  const distance = touchStart - touchEnd;
  const isLeftSwipe  = distance > minSwipeDistance;
  const isRightSwipe = distance < -minSwipeDistance;

  // Swipe da borda direita → abre sidebar
  if (isLeftSwipe && touchStart > window.innerWidth - 50) {
    setIsToggled(true);
    setIsMobileCollapsed(true);
  }
  // Swipe para direita com sidebar aberta → fecha
  else if (isRightSwipe && isToggled) {
    setIsToggled(false);
    setIsMobileCollapsed(true);
  }
};

// Aplicado no wrapper raiz:
<div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
```

---

## Padrão Mobile: Table → Cards

Tabelas são substituídas por cards no mobile via classes utilitárias:

```html
<!-- Table: visível apenas no desktop -->
<div class="table-responsive-mobile">
  <table>...</table>
</div>

<!-- Cards: visíveis apenas no mobile -->
<div class="mobile-card-view">
  <div class="mobile-item-card">
    <div class="mobile-item-card__header">
      <span class="mobile-item-card__title">Nome do item</span>
      <div class="mobile-item-card__actions">
        <button class="btn btn-sm">...</button>
      </div>
    </div>
    <div class="mobile-item-card__body">
      <div class="mobile-item-card__row">
        <span class="mobile-item-card__label">Quantidade</span>
        <span class="mobile-item-card__value">10 kg</span>
      </div>
    </div>
  </div>
</div>
```

```css
/* mobile.css */
@media (max-width: 767px) {
  .table-responsive-mobile table { display: none !important; }
  .mobile-card-view { display: block !important; }
}
@media (min-width: 768px) {
  .mobile-card-view { display: none !important; }
}
```

---

## Ajustes Globais (mobile.css)

### Tipografia
```css
@media (max-width: 767px) {
  h1 { font-size: 1.5rem !important; }
  h2 { font-size: 1.3rem !important; }
  h3 { font-size: 1.1rem !important; }
  h4, h5, h6 { font-size: 1rem !important; }
}
```

### Botões
```css
@media (max-width: 767px) {
  .btn { padding: 0.5rem 0.75rem !important; font-size: 0.875rem !important; }
  .btn-group { flex-direction: column !important; }
  .btn-group .btn { width: 100% !important; }
  .d-flex.gap-2 { flex-direction: column !important; }
  .d-flex.gap-2 .btn { width: 100% !important; }
}
```

### Modais
```css
@media (max-width: 767px) {
  .modal-dialog { margin: 0 !important; max-width: 100% !important; }
  .modal-content { border-radius: 0 !important; min-height: 100vh !important; }
}
```

### Overflow e Scroll
```css
@media (max-width: 767px) {
  body { overflow-x: hidden !important; }
  .table-wrapper { overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; }
}
```

### Containers
```css
@media (max-width: 767px) {
  .container, [class*='container'] {
    padding-left: 10px !important;
    padding-right: 10px !important;
  }
}
```

---

## Navbar: Edição de Layout (SUPER_ADMIN)

O SUPER_ADMIN pode reorganizar o menu sidebar via drag-and-drop, mas **somente no desktop** (não editável no mobile):

```tsx
// Layout.tsx:906
const canEditNavbar = isSuperAdmin && !isMobile && !isMenuCollapsed && layoutLoaded;
```

A configuração é salva no backend (`/api/admin/navbar-layout`) e restaurada ao carregar o layout.

---

## Overlay Mobile

```tsx
{/* Overlay escuro ao abrir sidebar no mobile */}
<div
  className={styles.overlay}
  onClick={handleOverlayClick}
  aria-hidden="true"
/>
```

O overlay aparece apenas quando a sidebar está aberta no mobile — CSS no Layout.module.css controla a visibilidade via classe `.toggled`.

---

## Topbar Mobile

No mobile, uma topbar horizontal substitui o sidebar fixo lateral. Ela exibe:
- Logo Kaizen (esquerda)
- Botão hamburger (abre sidebar)
- Ícone de notificações com badge
- Avatar do usuário

No desktop a topbar não aparece — o sidebar lateral ocupa o lado esquerdo da tela.

---

## Resumo de Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `frontend/src/components/Layout.tsx` | Lógica JS de responsividade, swipe, isMobile state |
| `frontend/src/components/Layout.module.css` | Estilos do sidebar, overlay, topbar, media queries |
| `frontend/src/styles/mobile.css` | Ajustes globais de componentes Bootstrap no mobile |
| `frontend/src/App.tsx` | Bootstrap CSS importado globalmente |
