# Diagrama de Fluxo de Dados — Sistema "Kaizen Lists" (Baseado na Lógica das Planilhas)

Este diagrama textual representa o fluxo de dados entre os atores (Colaborador, Administrador) e os componentes do sistema, refletindo a lógica de "espelho" das planilhas e o cálculo automático de pedidos.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FLUXO DE DADOS DO SISTEMA                        │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐                                           ┌──────────────┐
│ COLABORADOR  │                                           │ADMINISTRADOR │
│  (Usuário)   │                                           │   (Gestor)   │
└──────┬───────┘                                           └──────┬───────┘
       │                                                          │
       │ 1. Acessa sua área/setor                                │
       │    (Ex: Horti, Cozinha)                                 │
       ▼                                                          │
┌──────────────────────────┐                                     │
│  ESPELHO DA LISTA MÃE    │                                     │
│  (Visualização do Setor) │                                     │
│                          │                                     │
│  - Lista de Itens        │                                     │
│  - Quantidade Atual      │                                     │
│    (campo editável)      │                                     │
└──────┬───────────────────┘                                     │
       │                                                          │
       │ 2. Preenche quantidades                                 │
       │    atuais dos itens                                     │
       │                                                          │
       │ 3. Clica "Submeter"                                     │
       ▼                                                          │
┌──────────────────────────────────┐                             │
│      API BACKEND (Flask)         │                             │
│                                  │                             │
│  POST /api/v1/estoque/submit     │                             │
│                                  │                             │
│  Payload:                        │                             │
│  {                               │                             │
│    setor_id: "horti",            │                             │
│    usuario_id: 123,              │                             │
│    itens: [                      │                             │
│      {item_id: 1, qtd_atual: 5}, │                             │
│      {item_id: 2, qtd_atual: 2}  │                             │
│    ]                             │                             │
│  }                               │                             │
└──────┬───────────────────────────┘                             │
       │                                                          │
       │ 4. Valida e persiste dados                              │
       ▼                                                          │
┌──────────────────────────────────────┐                         │
│     BANCO DE DADOS (PostgreSQL)      │                         │
│                                      │                         │
│  Tabela: ESTOQUE                     │                         │
│  ┌────────┬──────────┬──────────┬───┴──────┬────────────┐     │
│  │item_id │ setor_id │qtd_atual │qtd_minima│ pedido     │     │
│  ├────────┼──────────┼──────────┼──────────┼────────────┤     │
│  │   1    │  horti   │    5     │    8     │     3      │     │
│  │   2    │  horti   │    2     │    5     │     3      │     │
│  │   3    │  horti   │   10     │    8     │     0      │     │
│  └────────┴──────────┴──────────┴──────────┴────────────┘     │
│                                      │                         │
│  5. Trigger/Stored Procedure ou      │                         │
│     Lógica no Backend calcula:       │                         │
│     pedido = MAX(qtd_minima -        │                         │
│                  qtd_atual, 0)       │                         │
└──────────────────┬───────────────────┘                         │
                   │                                             │
                   │ 6. Admin consulta dados consolidados        │
                   │    GET /api/v1/admin/lista-mae              │
                   ▼                                             │
        ┌─────────────────────────────┐                          │
        │   LISTA MÃE CONSOLIDADA     │◄─────────────────────────┘
        │   (Visão Administrativa)    │
        │                             │  7. Admin acessa dashboard
        │  - Todos os itens           │     e visualiza:
        │  - Todas as áreas           │
        │  - Quantidade atual         │     • Estoque por setor
        │    (última submissão)       │     • Itens em falta
        │  - Estoque mínimo           │     • Pedidos a gerar
        │  - Pedido calculado         │
        └─────────────┬───────────────┘
                      │
                      │ 8. Admin filtra itens com pedido > 0
                      │    e exporta por fornecedor
                      ▼
        ┌─────────────────────────────┐
        │   EXPORTAÇÃO DE PEDIDOS     │
        │                             │
        │  GET /api/v1/admin/pedidos/ │
        │      export?fornecedor={id} │
        │                             │
        │  Retorna texto formatado:   │
        │  "Tomate - 3 unidades"      │
        │  "Cebola - 3 unidades"      │
        └─────────────────────────────┘
```

***

## Descrição Detalhada do Fluxo

**Etapa 1-3: Colaborador Preenche o Espelho**  
O colaborador acessa uma tela que exibe apenas os itens de sua área (ex: Horti). Ele insere as quantidades atuais e submete os dados.

**Etapa 4-5: Backend Processa e Atualiza a Lista Mãe**  
O backend recebe os dados, valida e atualiza a tabela `estoque` no banco de dados. Imediatamente (via trigger, stored procedure ou lógica de aplicação), o sistema calcula o campo `pedido` usando a fórmula:  
$$
\text{pedido} = \max(\text{qtd\_minima} - \text{qtd\_atual}, 0)
$$

**Etapa 6-7: Administrador Visualiza a Lista Mãe**  
O administrador acessa o dashboard administrativo, que consome o endpoint da "Lista Mãe" consolidada. Ele vê todos os setores, itens, quantidades atuais (últimas enviadas pelos colaboradores), estoques mínimos e pedidos calculados.

**Etapa 8: Exportação de Pedidos**  
O admin pode filtrar apenas itens com `pedido > 0` e exportar por fornecedor, gerando um texto simples para copiar e colar no WhatsApp ou sistema de compras.

***

## Observações Importantes

- O colaborador **nunca vê nem edita** o estoque mínimo ou o pedido calculado.  
- O administrador **define o estoque mínimo** e **visualiza o pedido calculado automaticamente**.  
- A "Lista Mãe" é a **fonte única de verdade** (single source of truth), alimentada pelos espelhos/setores dos colaboradores.  
- O sistema mantém auditoria: quem enviou, quando e quais valores, permitindo rastreabilidade.

Este diagrama reflete exatamente a lógica da sua planilha Excel, agora traduzida para um fluxo de aplicação web com banco de dados relacional e API REST.