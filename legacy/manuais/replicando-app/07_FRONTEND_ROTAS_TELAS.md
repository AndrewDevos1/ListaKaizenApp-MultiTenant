# 07 — Frontend: Rotas e Telas

---

## Configuração do Router

**Arquivo:** `frontend/src/App.tsx`

O React Router v7 usa `BrowserRouter` com rotas aninhadas protegidas por guards:

```tsx
<BrowserRouter>
  <Routes>
    {/* Públicas */}
    <Route path="/" element={<HomePage />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/convite" element={<RegisterConvite />} />

    {/* Protegidas — qualquer autenticado */}
    <Route element={<ProtectedRoute />}>
      <Route element={<Layout />}>

        {/* Admin */}
        <Route element={<AdminRoute />}>
          {/* ... rotas admin ... */}
        </Route>

        {/* Collaborator */}
        <Route element={<CollaboratorRoute />}>
          {/* ... rotas collaborator ... */}
        </Route>

      </Route>
    </Route>
  </Routes>
</BrowserRouter>
```

---

## Rotas Públicas

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/` | `HomePage` | Landing page com apresentação |
| `/login` | `Login` | Formulário de login |
| `/register` | `Register` | Cadastro público |
| `/convite` | `RegisterConvite` | Cadastro via token de convite |
| `/register-restaurant` | `RegisterRestaurante` | Solicita cadastro de restaurante |
| `/supplier/login` | `SupplierLogin` | Login do fornecedor |
| `/supplier/register` | `SupplierRegister` | Cadastro de fornecedor |
| `/supplier/register-convite` | `SupplierRegisterConvite` | Fornecedor via convite |

---

## Rotas Admin

Base: `/admin/`

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/admin/` | `AdminLanding` | Dashboard admin |
| `/admin/gerenciar-usuarios` | `GerenciarUsuarios` | Aprovação e gestão de usuários |
| `/admin/users` | `GerenciarUsuarios` | Alias |
| `/admin/users/new` | `CriarUsuario` | Criar usuário manualmente |
| `/admin/convites` | `GerenciarConvites` | Tokens de convite |
| `/admin/convites-fornecedor` | `ConvitesFornecedor` | Convites para fornecedores |
| **LISTAS** | | |
| `/admin/listas-compras` | `ListasCompras` | ⭐ Lista todas as listas |
| `/admin/listas/:listaId/lista-mae` | `GerenciarListaMae` | Catálogo de itens da lista |
| `/admin/listas/:listaId/gerenciar-itens` | `GerenciarItensLista` | ⭐ Adicionar/remover itens |
| `/admin/catalogo-global` | `CatalogoGlobal` | ⭐ Gerenciar ListaMaeItens |
| **SUBMISSÕES** | | |
| `/admin/submissoes` | `GerenciarSubmissoes` | ⭐ Lista submissões |
| `/admin/submissoes/:id` | `DetalhesSubmissao` | ⭐ Detalhes + aprovação |
| `/admin/gerenciar-pedidos` | `GerenciarPedidos` | Lista pedidos individuais |
| **FORNECEDORES** | | |
| `/admin/fornecedores` | `GerenciarFornecedores` | Lista fornecedores |
| `/admin/fornecedores/:id/detalhes` | `DetalhesFornecedor` | Detalhes do fornecedor |
| `/admin/fornecedores-cadastrados` | `FornecedoresCadastrados` | Fornecedores com conta |
| `/admin/itens-regionais` | `ItensRegionais` | Itens compartilhados |
| **COTAÇÕES** | | |
| `/admin/gerar-cotacao` | `GerarCotacao` | Gerar cotação por fornecedor |
| `/admin/cotacoes` | `ListaCotacoes` | Lista cotações |
| `/admin/cotacoes/:cotacaoId` | `DetalhesCotacao` | Detalhes cotação |
| **OUTROS** | | |
| `/admin/areas` | `GerenciarAreas` | Áreas do restaurante |
| `/admin/items` | `GerenciarItens` | Itens do catálogo legado |
| `/admin/checklists` | `GerenciarChecklists` | Checklists |
| `/admin/checklists/:id` | `DetalhesChecklist` | Detalhes checklist |
| `/admin/sugestoes` | `GerenciarSugestoes` | Sugestões de novos itens |
| `/admin/listas-rapidas` | `ListasRapidas` | Listas rápidas |
| `/admin/pop-templates` | `POPTemplates` | Templates POP |
| `/admin/global` | `GlobalDashboard` | ⭐ Dashboard super admin |
| `/admin/restaurantes` | `GerenciarRestaurantes` | (SUPER_ADMIN) |
| `/admin/solicitacoes-restaurante` | `SolicitacoesRestaurante` | (SUPER_ADMIN) |
| `/admin/configuracoes` | `ConfiguracoesAdmin` | Config do restaurante |
| `/admin/editar-perfil` | `EditarPerfil` | Perfil do admin |
| `/admin/mudar-senha` | `MudarSenha` | Trocar senha |

---

## Rotas Colaborador

Base: `/collaborator/`

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/collaborator/` | `DashboardColaborador` | Dashboard com resumo |
| **LISTAS (PRINCIPAL)** | | |
| `/collaborator/listas` | `MinhasListasCompras` | ⭐ Listas atribuídas |
| `/collaborator/listas/:listaId/estoque` | `EstoqueListaCompras` | ⭐ Atualizar estoque e submeter |
| **SUBMISSÕES** | | |
| `/collaborator/submissoes` | `MinhasSubmissoes` | Histórico de envios |
| `/collaborator/submissoes/:id` | `DetalhesSubmissaoColaborador` | Status de um envio |
| **OUTROS** | | |
| `/collaborator/sugestoes` | `SugestoesColaborador` | Sugerir novos itens |
| `/collaborator/areas` | `MinhasAreas` | Áreas (legado) |
| `/collaborator/areas/:areaId/estoque` | `EstoqueLista` | Estoque por área (legado) |
| `/collaborator/pop-listas` | `POPListasColaborador` | POPs atribuídos |
| `/collaborator/pop-execucoes/:id` | `ExecucaoPOP` | Executar POP |
| `/collaborator/configuracoes` | `ConfiguracoesColaborador` | Preferências |
| `/collaborator/mudar-senha` | `MudarSenha` | Trocar senha |
| `/collaborator/perfil` | `PerfilColaborador` | Perfil |

---

## Componentes Principais

### `Layout.tsx`
Wrapper de todas as páginas autenticadas:
- **Navbar lateral** com menu hamburger, categorias (grupos) colapsáveis
- **Links** baseados no role do usuário, filtrados por `NavbarLayoutConfig`
- **Badge** de notificações não lidas
- **Informações do usuário** logado
- **Atividades recentes** — seção dinâmica baseada nos últimos itens acessados
- Responsivo: colapsa em mobile, suporte a swipe gestures
- **Seletor de perfil (SUPER_ADMIN):** dropdown sempre visível para alternar entre roles (SUPER_ADMIN, ADMIN, COLLABORATOR, SUPPLIER) e ver/editar a navbar de cada perfil
- **Modo de edição (SUPER_ADMIN, desktop):** permite reorganizar itens via drag-and-drop, ocultar/exibir itens individuais ou categorias inteiras em cascata, renomear itens, criar/remover grupos
- **Persistência:** layout salvo por role via `POST /api/auth/navbar-layout`; preferências de expansão de grupo por usuário via `POST /api/auth/navbar-preferences`
- **Modelo de dados:** `NavbarLayoutConfig = { groups: LayoutGroup[], hidden_items: string[], item_labels?: Record<string,string> }`

### `ProtectedRoute.tsx`
```tsx
// Redireciona para /login se não autenticado
if (!isAuthenticated) return <Navigate to="/login" replace />;
return <Outlet />;
```

### `AdminRoute.tsx`
```tsx
// Redireciona para /collaborator se não for admin
const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
if (!isAdmin) return <Navigate to="/collaborator" replace />;
return <Outlet />;
```

---

## Modais Importantes

### MergeModal
**Arquivo:** `features/admin/MergeModal.tsx`
**Abre em:** `DetalhesSubmissao` quando `submissao.status === 'APROVADO'`
**Steps:** Selecionar → Preview → Compartilhar (ver doc 06)

### Modal de Criação de Lista
**Abre em:** `ListasCompras.tsx`
**Campos:** Nome (obrigatório) | Descrição (opcional)
**Submete:** `POST /api/admin/listas`

### Modal de Adição de Item
**Abre em:** `GerenciarItensLista.tsx`
**Elementos:**
- Campo de busca (busca no catálogo global)
- Resultado em tempo real
- Campos: quantidade_minima, usa_threshold, quantidade_por_fardo
- Botão "Criar novo item" se não encontrado

### Modal de Atribuição de Colaboradores
**Abre em:** `ListasCompras.tsx`
**Elementos:**
- Lista de colaboradores do restaurante
- Checkboxes múltiplos
- Submete: `POST /api/admin/listas/:id/colaboradores`

---

## Serviço de API (api.ts)

```typescript
// frontend/src/services/api.ts

const getApiBaseUrl = () => {
    if (window.location.hostname.includes('railway.app')) {
        return 'https://kaizen-lists-api-production.up.railway.app/api';
    }
    if (process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL;
    }
    return 'http://127.0.0.1:5000/api';
};

const api = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 60000,
    headers: { 'Content-Type': 'application/json' }
});
```

---

## Convenções de Nomenclatura

### Arquivos de componentes
- PascalCase: `ListasCompras.tsx`, `DetalhesSubmissao.tsx`
- Modais: `MergeModal.tsx`, `CriarItemModal.tsx`
- Hooks: `useDashboardData.ts`, `useSubmissoes.ts`

### Chamadas de API no frontend
```typescript
// Padrão usado nas telas
const [data, setData] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');

const fetchData = async () => {
    setLoading(true);
    try {
        const response = await api.get('/admin/submissoes');
        setData(response.data);
    } catch (err: any) {
        setError(err.response?.data?.error || 'Erro ao carregar dados');
    } finally {
        setLoading(false);
    }
};
```

### Exibição de status
```typescript
const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
        'PENDENTE': 'warning',
        'APROVADO': 'success',
        'REJEITADO': 'danger',
        'PARCIALMENTE_APROVADO': 'info'
    };
    return <Badge bg={map[status] || 'secondary'}>{status}</Badge>;
};
```
