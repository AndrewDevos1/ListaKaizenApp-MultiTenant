
# Diagrama de Fluxo de Dados — Administrador Cria Lista e Atribui Colaboradores

Este diagrama estende o fluxo anterior, adicionando a lógica de **criação de listas pelo administrador** e **atribuição de 0 ou N colaboradores** a cada lista.

```
┌─────────────────────────────────────────────────────────────────────────┐
│            FLUXO: CRIAÇÃO E ATRIBUIÇÃO DE LISTAS (Admin)                 │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│ADMINISTRADOR │
│   (Gestor)   │
└──────┬───────┘
       │
       │ 1. Acessa "Gerenciar Listas"
       │    no dashboard administrativo
       ▼
┌─────────────────────────────────┐
│   TELA: GERENCIAR LISTAS        │
│                                 │
│  - Botão "Criar Nova Lista"     │
│  - Tabela de listas existentes  │
│    com ações (Editar, Excluir)  │
└──────┬──────────────────────────┘
       │
       │ 2. Clica "Criar Nova Lista"
       ▼
┌─────────────────────────────────────────────┐
│   MODAL/FORMULÁRIO: CRIAR LISTA             │
│                                             │
│  Campos:                                    │
│  • Nome da Lista (ex: "Lista Horti 2025")  │
│  • Setor/Área (dropdown: Horti, Cozinha...) │
│  • Descrição (opcional)                     │
│  • Status (Ativa/Inativa)                   │
│                                             │
│  Botões: [Cancelar] [Salvar]                │
└──────┬──────────────────────────────────────┘
       │
       │ 3. Preenche dados e clica "Salvar"
       │
       │    POST /api/v1/admin/listas
       │    {
       │      nome: "Lista Horti 2025",
       │      setor_id: 2,
       │      descricao: "...",
       │      status: "ativa"
       │    }
       ▼
┌──────────────────────────────────────┐
│      API BACKEND (Flask)             │
│                                      │
│  Controller: criar_lista()           │
│  1. Valida dados                     │
│  2. Cria registro na tabela LISTAS   │
│  3. Retorna lista_id                 │
└──────┬───────────────────────────────┘
       │
       │ 4. Persiste no banco
       ▼
┌──────────────────────────────────────────────────┐
│     BANCO DE DADOS (PostgreSQL)                  │
│                                                  │
│  Tabela: LISTAS                                  │
│  ┌─────────┬──────────────────┬─────────┬───────┐│
│  │lista_id │ nome             │setor_id │status ││
│  ├─────────┼──────────────────┼─────────┼───────┤│
│  │   1     │Lista Horti 2025  │    2    │ativa  ││
│  └─────────┴──────────────────┴─────────┴───────┘│
│                                                  │
│  Tabela: LISTA_ITENS (itens da lista)            │
│  ┌─────────┬─────────┬──────────────┐            │
│  │lista_id │item_id  │qtd_minima    │            │
│  ├─────────┼─────────┼──────────────┤            │
│  │   1     │   10    │      8       │            │
│  │   1     │   11    │      5       │            │
│  └─────────┴─────────┴──────────────┘            │
└──────┬───────────────────────────────────────────┘
       │
       │ 5. Admin agora atribui colaboradores
       │    Clica "Atribuir Colaboradores" na lista
       ▼
┌─────────────────────────────────────────────────┐
│   MODAL: ATRIBUIR COLABORADORES                 │
│                                                 │
│  Lista selecionada: "Lista Horti 2025"          │
│                                                 │
│  Colaboradores Disponíveis:                     │
│  ☐ João Silva (ID: 5)                           │
│  ☑ Maria Santos (ID: 7)   ← selecionado         │
│  ☑ Pedro Costa (ID: 9)    ← selecionado         │
│  ☐ Ana Oliveira (ID: 12)                        │
│                                                 │
│  Botões: [Cancelar] [Salvar Atribuições]        │
└──────┬──────────────────────────────────────────┘
       │
       │ 6. Admin seleciona colaboradores e salva
       │
       │    POST /api/v1/admin/listas/{lista_id}/colaboradores
       │    {
       │      lista_id: 1,
       │      colaboradores_ids: [7, 9]
       │    }
       ▼
┌──────────────────────────────────────┐
│      API BACKEND (Flask)             │
│                                      │
│  Controller: atribuir_colaboradores()│
│  1. Valida lista e usuários          │
│  2. Remove atribuições antigas       │
│  3. Cria novos registros             │
└──────┬───────────────────────────────┘
       │
       │ 7. Persiste atribuições
       ▼
┌──────────────────────────────────────────────────┐
│     BANCO DE DADOS (PostgreSQL)                  │
│                                                  │
│  Tabela: LISTA_COLABORADORES                     │
│  ┌─────────┬──────────────┬────────────────┐     │
│  │lista_id │colaborador_id│data_atribuicao │     │
│  ├─────────┼──────────────┼────────────────┤     │
│  │   1     │      7       │  2025-10-25    │     │
│  │   1     │      9       │  2025-10-25    │     │
│  └─────────┴──────────────┴────────────────┘     │
└──────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│   RESULTADO: COLABORADORES PODEM ACESSAR       │
└────────────────────────────────────────────────┘

┌──────────────┐                  ┌──────────────┐
│  MARIA (ID:7)│                  │ PEDRO (ID:9) │
│ Colaboradora │                  │ Colaborador  │
└──────┬───────┘                  └──────┬───────┘
       │                                 │
       │ 8. Fazem login                  │
       │                                 │
       │ GET /api/v1/colaborador/listas  │
       │                                 │
       ▼                                 ▼
┌──────────────────────────────────────────────────┐
│      API BACKEND (Flask)                         │
│                                                  │
│  Controller: listar_listas_do_colaborador()      │
│  1. Busca listas atribuídas ao colaborador       │
│  2. Retorna apenas listas ativas                 │
└──────┬───────────────────────────────────────────┘
       │
       │ 9. Query no banco
       ▼
┌──────────────────────────────────────────────────┐
│  SELECT l.* FROM listas l                        │
│  JOIN lista_colaboradores lc                     │
│    ON l.lista_id = lc.lista_id                   │
│  WHERE lc.colaborador_id = {user_id}             │
│    AND l.status = 'ativa'                        │
└──────┬───────────────────────────────────────────┘
       │
       │ 10. Retorna listas disponíveis
       ▼
┌─────────────────────────────────┐
│  TELA: LISTAS DISPONÍVEIS       │
│  (Visão do Colaborador)         │
│                                 │
│  - Lista Horti 2025             │
│    [Preencher] ← botão clicável │
│                                 │
└─────────────────────────────────┘
       │
       │ 11. Colaborador preenche e submete
       │     (fluxo continua conforme diagrama anterior)
       ▼
   [Ver diagrama anterior: Submissão de Dados]
```

***

## Descrição Detalhada do Fluxo

**Etapas 1-4: Administrador Cria a Lista**  
- Admin acessa "Gerenciar Listas" e clica em "Criar Nova Lista".
- Preenche nome, setor, descrição e status.
- O sistema persiste na tabela `LISTAS` e pode automaticamente popular `LISTA_ITENS` com os itens padrão daquele setor.

**Etapas 5-7: Administrador Atribui Colaboradores**  
- Admin seleciona uma lista existente e clica "Atribuir Colaboradores".
- Marca os colaboradores desejados (pode ser 0, 1 ou vários).
- O sistema grava na tabela `LISTA_COLABORADORES`, criando o vínculo Many-to-Many entre listas e colaboradores.

**Etapas 8-10: Colaboradores Visualizam Suas Listas**  
- Ao fazer login, colaboradores fazem GET `/api/v1/colaborador/listas`.
- O backend consulta `LISTA_COLABORADORES` e retorna apenas as listas atribuídas àquele usuário e ativas.
- O colaborador vê apenas as listas que o admin liberou para ele.

**Etapa 11: Preenchimento e Submissão**  
- A partir daqui, o fluxo segue conforme o diagrama anterior (colaborador preenche quantidades, submete, sistema calcula pedidos).

***

## Modelo de Dados Atualizado

```sql
-- Tabela de Listas
CREATE TABLE listas (
    lista_id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    setor_id INTEGER REFERENCES setores(setor_id),
    descricao TEXT,
    status VARCHAR(20) DEFAULT 'ativa',
    criado_em TIMESTAMP DEFAULT NOW(),
    criado_por INTEGER REFERENCES usuarios(usuario_id)
);

-- Tabela de Itens da Lista (define quais itens e estoque mínimo)
CREATE TABLE lista_itens (
    lista_item_id SERIAL PRIMARY KEY,
    lista_id INTEGER REFERENCES listas(lista_id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES itens(item_id),
    qtd_minima DECIMAL(10,2) NOT NULL,
    UNIQUE(lista_id, item_id)
);

-- Tabela de Atribuição (Many-to-Many: Listas ↔ Colaboradores)
CREATE TABLE lista_colaboradores (
    lista_colaborador_id SERIAL PRIMARY KEY,
    lista_id INTEGER REFERENCES listas(lista_id) ON DELETE CASCADE,
    colaborador_id INTEGER REFERENCES usuarios(usuario_id) ON DELETE CASCADE,
    data_atribuicao TIMESTAMP DEFAULT NOW(),
    UNIQUE(lista_id, colaborador_id)
);
```

***

## Casos de Uso

**Caso 1: Lista sem colaboradores atribuídos**  
- Admin cria uma lista mas não atribui ninguém.
- Nenhum colaborador verá essa lista até que seja atribuída.

**Caso 2: Lista atribuída a múltiplos colaboradores**  
- Admin atribui João, Maria e Pedro à "Lista Cozinha".
- Os três verão essa lista disponível e poderão preenchê-la.
- Cada submissão atualiza a mesma "Lista Mãe", sobrescrevendo ou consolidando dados conforme a lógica definida.

**Caso 3: Remoção de atribuição**  
- Admin pode remover um colaborador da lista.
- O colaborador imediatamente perde acesso visual àquela lista.

Este fluxo garante controle total do administrador sobre quem acessa cada lista, permitindo flexibilidade na gestão de equipes e setores.