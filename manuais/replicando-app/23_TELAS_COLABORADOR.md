# 23 — Telas do Colaborador (Detalhadas)

> Descrição detalhada de todas as telas do colaborador: layout, estados, lógica de formulários, validações, cálculos e integração com a API.

---

## Rota Base: `/collaborator`

Protegida por `CollaboratorRoute.tsx`. Admins também podem acessar estas rotas.

---

## 1. MinhasListasCompras.tsx

**Rota:** `/collaborator/listas`

### Layout

```
┌─────────────────────────────────────────────────────┐
│ [← Voltar ao Dashboard]                             │
│ 🛒 Minhas Listas de Compras                         │
│ Listas atribuídas a você. Clique em "Preencher"     │
├─────────────────────────────────────────────────────┤
│ [✓ Sucesso] [! Erro]                               │
├─────────────────────────────────────────────────────┤
│ GRID DE CARDS (3 cols lg, 2 cols md, 1 col sm)     │
│  ┌──────────────┐  ┌──────────────┐                │
│  │ 📋 Lista 1   │  │ 📋 Lista 2   │                │
│  │ Descrição... │  │ Descrição... │                │
│  │ Criada: 15/02│  │ Criada: 14/02│                │
│  │[✏️ Preencher]│  │[✏️ Preencher]│                │
│  └──────────────┘  └──────────────┘                │
│                                                      │
│ (vazio): 📋 Você ainda não tem listas atribuídas   │
└─────────────────────────────────────────────────────┘
```

### Estado

| Variável | Tipo | Uso |
|----------|------|-----|
| `listas` | Lista[] | Listas atribuídas |
| `loading` | boolean | Spinner inicial |
| `error` | string\|null | Alerta de erro |

### Estrutura da Lista
```typescript
interface Lista {
  id: number;
  nome: string;
  descricao: string | null;
  data_criacao: string;  // ISO date
}
```

### API
- `GET /collaborator/minhas-listas` → `{ listas: Lista[] }`

### Card por Lista
1. Header: 📋 + nome (h5)
2. Body: descrição + data formatada (`formatarDataBrasiliaSemHora()`)
3. Footer: Botão "✏️ Preencher" → `/collaborator/listas/{id}/estoque`

---

## 2. EstoqueListaCompras.tsx

**Rota:** `/collaborator/listas/:listaId/estoque`

Esta é a tela principal do colaborador — onde ele preenche quantidades e submete a lista.

### Layout

```
┌──────────────────────────────────────────────────────────┐
│ [← Voltar]         [🔔 Sugerir Novo Item]               │
│ Lista: Hortifruti - Semana                               │
│ Atualize as quantidades atuais de cada item...           │
├──────────────────────────────────────────────────────────┤
│ [✓ Sucesso] [! Erro] [✓ Sugestão enviada]               │
├──────────────────────────────────────────────────────────┤
│ [BUSCA: input]     │ Em Falta: 5 | Alterados: 3 | Total: 45 │
├──────────────────────────────────────────────────────────┤
│ TABELA DE ITENS (colunas clicáveis para ordenar)        │
│ ┌──────────────┬──────┬──────┬──────┬────────┐         │
│ │ Item ▲       │ Un.  │Qtd.M │Qtd.A │Pedido  │         │
│ ├──────────────┼──────┼──────┼──────┼────────┤         │
│ │ Cebola Roxa  │ kg   │  5   │[EDIT]│ [3]🔴  │         │
│ │ Batata       │ kg   │  10  │[EDIT]│ [0]🟢  │         │
│ │ Alho         │ kg   │  2   │[EDIT]│ [-]⬜  │ (inválido)│
│ └──────────────┴──────┴──────┴──────┴────────┘         │
├──────────────────────────────────────────────────────────┤
│ [⬜ Salvar Rascunho]   [✓ Submeter Lista]               │
│ (Submeter desabilitado se 0 itens alterados)             │
└──────────────────────────────────────────────────────────┘

MODAL SUCESSO (após submeter):
┌──────────────────────────┐
│ ✅ (animação pulsante)   │
│ Lista Submetida!         │
│ 3 pedido(s) criado(s)    │
│ Redirecionando em 5s...  │
└──────────────────────────┘
```

### Estados

| Variável | Tipo | Uso |
|----------|------|-----|
| `estoque` | EstoqueItem[] | Itens com quantidades |
| `originalEstoque` | EstoqueItem[] | Valores originais do servidor |
| `listaName` | string | Nome da lista |
| `searchTerm` | string | Filtro de busca |
| `isLoading` | boolean | Carregando dados |
| `isSubmitting` | boolean | Enviando submissão |
| `error` | string | Alerta de erro |
| `success` | string | Alerta de sucesso |
| `showSuccessModal` | boolean | Modal após submeter |
| `showSugerirModal` | boolean | Modal de sugestão |
| `incompleteIds` | Set\<number\> | IDs com quantidade inválida |
| `draftKey` | string | Chave do rascunho offline |
| `ordenacao` | {campo, direcao} | Ordenação da tabela |

### Colunas da Tabela

| Coluna | Tipo | Detalhes |
|--------|------|----------|
| Item | string | Nome do item (clicável para ordenar) |
| Unidade | text | Unidade de medida |
| Qtd. Mín. | number | Mínimo (badge cinza) |
| Qtd. Atual | input | Campo de edição (texto, aceita expressões) |
| Pedido | badge | Calculado automaticamente |

### Estilos de Linha
- **Amarelo:** `changedRow` — quantidade foi alterada do original
- **Vermelho:** `invalidRow` — quantidade inválida/incompleta

### Input de Quantidade
- Aceita: números, decimais (vírgula ou ponto), adição (ex: "10+5")
- `parseQuantidadeInput()` converte para número ou null
- `parseSumExpression()` avalia expressões aritméticas
- **Navegação:** Tab → item anterior; Enter → confirma e vai ao próximo

### Cálculo do Pedido
```javascript
function calculatePedido(qtdMinima, qtdAtual, usaThreshold, qtdPorFardo) {
  if (qtdAtual > qtdMinima) return 0;              // Em estoque suficiente
  if (usaThreshold) return qtdPorFardo || 1;       // Threshold: pede 1 fardo
  return Math.max(0, qtdMinima - qtdAtual);         // Padrão: diferença
}
```

**Exibição do badge:**
- `[0]` verde — não precisa pedir
- `[12]` vermelho — precisa pedir (mostra quantidade)
- `[-]` cinza — quantidade inválida (não calcula)

### Resumo (Card superior direito)
- **Em Falta:** count de itens com `qtd_atual < qtd_minima`
- **Alterados:** count com `item.changed === true`
- **Total:** total de itens no estoque

### Integração Offline (Rascunho)
- Rascunho salvo via `saveOfflineDraft()` a cada alteração (debounce 400ms)
- Chave: `'lista_[listaId]'`
- Na carga: verifica rascunho → merge com dados do servidor se existir
- Erro de rede: mostra "Sem conexão. Rascunho salvo localmente..."
- Sucesso: `removeOfflineDraft()`

### Fluxo de Submissão
1. Valida: todos os itens têm `qtd_atual !== null`
2. Erros: highlight vermelho + scroll para primeiro inválido
3. `isSubmitting = true`
4. `POST /v1/listas/{id}/estoque/submit`:
   ```json
   { "items": [{ "estoque_id": 1, "quantidade_atual": 5 }, ...] }
   ```
5. Sucesso → modal animado → remove rascunho → redirect após 5s
6. Erro → alerta mantém formulário

### Fluxo de Salvar Rascunho
1. Valida quantidades
2. Filtra `changed === true`
3. `PUT /collaborator/estoque/{id}` para cada item
4. Sucesso: `changed = false`, remove rascunho offline

### API Calls
| Endpoint | Método | Quando |
|----------|--------|--------|
| `/collaborator/listas/{id}` | GET | Carregar nome da lista |
| `/collaborator/listas/{id}/estoque` | GET | Carregar itens |
| `/collaborator/estoque/{estoque_id}` | PUT | Salvar rascunho |
| `/v1/listas/{id}/estoque/submit` | POST | Submeter lista |

---

## 3. MinhasSubmissoes.tsx

**Rota:** `/collaborator/submissions`

- Histórico de submissões do colaborador
- Tabela: Lista | Data | Status | Pedidos | Ações
- Badge de status: PENDENTE (amarelo), APROVADO (verde), REJEITADO (vermelho)
- Ação: "Ver Detalhes" → `/collaborator/submissions/{id}`

---

## 4. DetalhesSubmissaoColaborador.tsx

**Rota:** `/collaborator/submissions/:id`

- Cabeçalho: nome da lista, data, status geral
- Tabela de pedidos:
  - Item | Qtd. Solicitada | Status | Mensagem Admin
  - PENDENTE (amarelo), APROVADO (verde), REJEITADO (vermelho) por linha
- Somente leitura (colaborador não edita pedidos)

---

## 5. Telas POP do Colaborador

### MinhasPOPListas.tsx

**Rota:** `/collaborator/pop-listas`

- Lista de POPListas atribuídas ao colaborador (ou publicas)
- Cards com: nome, categoria, recorrência, horário sugerido, progresso de hoje
- Botão "Executar" → inicia ou retoma execução

### ExecutarPOPChecklist.tsx

**Rota:** `/collaborator/pop-execucoes/:id`

(Detalhado em `14_MODULO_POP.md`)

---

## 6. CriarListaRapida.tsx

**Rota:** `/collaborator/lista-rapida/criar`

(Detalhado em `16_LISTAS_RAPIDAS.md`)

---

## 7. SugestoesColaborador.tsx

**Rota:** `/collaborator/sugestoes`

(Detalhado em `17_SUGESTOES_ITENS.md`)

---

## 8. CollaboratorDashboard.tsx

**Rota:** `/collaborator`

### Layout

```
┌──────────────────────────────────────────────────┐
│ Olá, {nome}! 👋                                  │
│ Aqui está um resumo das suas atividades           │
├──────────────────────────────────────────────────┤
│ ┌──────────────┐  ┌──────────────┐               │
│ │ 📋 Listas    │  │ 📦 Submissões│               │
│ │ X atribuídas │  │ Y enviadas   │               │
│ │ [Ir para]    │  │ [Ir para]    │               │
│ └──────────────┘  └──────────────┘               │
│                                                   │
│ ┌──────────────┐  ┌──────────────┐               │
│ │ ✅ POPs Hoje │  │ 💡 Sugestões │               │
│ │ Z concluídas │  │ W pendentes  │               │
│ │ [Ir para]    │  │ [Ir para]    │               │
│ └──────────────┘  └──────────────┘               │
└──────────────────────────────────────────────────┘
```

### API Calls
- `GET /collaborator/minhas-listas` (count)
- `GET /collaborator/submissions` (count)
- `GET /collaborator/pop-execucoes/hoje` (count)
- `GET /auth/sugestoes/minhas` (count pendentes)

---

## Resumo de Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `frontend/src/features/collaborator/MinhasListasCompras.tsx` | Listagem de listas atribuídas |
| `frontend/src/features/collaborator/EstoqueListaCompras.tsx` | Preenchimento e submissão de estoque |
| `frontend/src/features/collaborator/MinhasSubmissoes.tsx` | Histórico de submissões |
| `frontend/src/features/collaborator/DetalhesSubmissaoColaborador.tsx` | Detalhe de submissão |
| `frontend/src/features/collaborator/MinhasPOPListas.tsx` | Listas POP atribuídas |
| `frontend/src/features/collaborator/ExecutarPOPChecklist.tsx` | Execução de POP |
| `frontend/src/features/collaborator/CriarListaRapida.tsx` | Criar lista rápida |
| `frontend/src/features/collaborator/SugestoesColaborador.tsx` | Sugestões de itens |
| `frontend/src/features/dashboard/CollaboratorDashboard.tsx` | Dashboard do colaborador |
