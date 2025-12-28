# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Adicionado

#### Funcionalidade de Listas Rápidas

- **Criação de Listas Rápidas pelo Colaborador**
  - Interface simplificada para criação rápida de listas
  - Seleção de itens do catálogo global com checkboxes
  - Definição de prioridades por item: Prevenção (🟢), Precisa Comprar (🟡), Urgente (🔴)
  - Campo de observação por item
  - Auto-completar nome da lista com data e dia da semana
  - Submissão direta para aprovação do admin

- **Gerenciamento de Listas Rápidas pelo Admin**
  - Integração completa com a tela de "Gerenciar Submissões"
  - Visualização unificada de listas tradicionais e listas rápidas
  - Filtros por status: Pendente, Aprovado, Rejeitado
  - Detalhamento completo das listas rápidas submetidas

- **Edição de Listas Rápidas Pendentes (Admin)**
  - Modo de edição interativo para listas pendentes
  - Adicionar novos itens do catálogo global via modal de busca
  - Remover itens com confirmação
  - Editar observações de cada item
  - Alterar prioridades dos itens
  - Salvar apenas as alterações realizadas (diff-based save)

- **Ações Administrativas**
  - Aprovar lista rápida com mensagem opcional ao colaborador
  - Rejeitar lista rápida com justificativa
  - Reverter lista aprovada/rejeitada para status pendente
  - Mensagens de feedback personalizadas

- **Compartilhamento e Exportação**
  - Copiar lista para área de transferência (formato texto)
  - Compartilhar via WhatsApp com formatação ASCII otimizada
  - Marcadores de prioridade em texto: [URGENTE], [COMPRAR], [PREVENCAO]
  - Compatibilidade total com encoding de texto

#### Melhorias de Interface

- **Ícones FontAwesome**
  - Substituição de todas as classes CSS por componentes React FontAwesome
  - Ícones consistentes em toda a aplicação
  - Melhor performance e controle de versão

- **Modal de Busca de Itens**
  - Interface modal para adicionar itens sem colisão de elementos
  - Busca em tempo real com filtro case-insensitive
  - Indicador visual para itens já adicionados
  - Auto-focus no campo de busca
  - Scroll interno para listas longas

- **UX Improvements**
  - Botões de ação alinhados horizontalmente
  - Ícone de lixeira para remover itens (mais intuitivo)
  - Confirmações de ações destrutivas
  - Feedback visual de loading/submitting
  - Badges coloridos por status e prioridade

#### Backend

- **Novos Modelos**
  - `ListaRapida`: Modelo para listas rápidas
  - `ListaRapidaItem`: Itens das listas rápidas com prioridades
  - `StatusListaRapida`: Enum (RASCUNHO, PENDENTE, APROVADA, REJEITADA)
  - `PrioridadeItem`: Enum (URGENTE, PRECISA_COMPRAR, PREVENCAO)

- **Novos Endpoints**
  - `POST /auth/listas-rapidas` - Criar lista rápida
  - `POST /auth/listas-rapidas/:id/itens` - Adicionar itens
  - `POST /auth/listas-rapidas/:id/submeter` - Submeter para aprovação
  - `GET /admin/listas-rapidas` - Listar todas (admin)
  - `GET /admin/listas-rapidas/:id` - Detalhes de lista específica
  - `GET /admin/listas-rapidas/:id/itens` - Itens de lista específica
  - `POST /admin/listas-rapidas/:id/aprovar` - Aprovar lista
  - `POST /admin/listas-rapidas/:id/rejeitar` - Rejeitar lista
  - `POST /admin/listas-rapidas/:id/reverter` - Reverter para pendente
  - `POST /admin/listas-rapidas/:id/itens` - Adicionar item (admin)
  - `PUT /admin/listas-rapidas/:id/itens/:item_id` - Editar item (admin)
  - `DELETE /admin/listas-rapidas/:id/itens/:item_id` - Remover item (admin)
  - `GET /admin/itens-globais` - Listar catálogo global de itens
  - `GET /admin/submissoes/:id` - Detalhes de submissão específica
  - `GET /auth/listas-rapidas/usuario/:id` - Listas do colaborador

- **Serviços Atualizados**
  - `get_all_submissoes()`: Unifica listas tradicionais e rápidas
  - Normalização de status entre diferentes tipos de lista
  - Eager loading otimizado para queries
  - Validações de permissões e estado

### Modificado

- **Modelo ListaMaeItem**
  - Refatorado para ser catálogo global independente
  - Removidos campos `lista_mae_id`, `quantidade_atual`, `quantidade_minima`
  - Relacionamento com listas via tabela intermediária `ListaItemRef`
  - Campos mantidos: `id`, `nome`, `unidade`, `criado_em`, `atualizado_em`

- **Tela de Gerenciar Submissões**
  - Adicionado campo `tipo_lista` para diferenciar listas tradicionais e rápidas
  - Roteamento inteligente baseado no tipo de lista
  - Exibição unificada de ambos os tipos

### Corrigido

- **Bug: Listas rápidas não apareciam em submissões do admin**
  - Causa: `get_all_submissoes()` só buscava listas tradicionais
  - Solução: Implementada busca e normalização de ambos os tipos

- **Bug: Erro `itensGlobais.filter is not a function`**
  - Causa: Backend retornava `{ itens: [...] }` mas frontend esperava array direto
  - Solução: Fallback `response.data.itens || response.data`

- **Bug: Emojis quebrando no WhatsApp**
  - Causa: Problemas de encoding Unicode
  - Solução: Substituição por marcadores ASCII

- **Bug: Ícones não aparecendo**
  - Causa: Uso de classes CSS em vez de componentes React
  - Solução: Migração para FontAwesome React components

- **Bug: Colisão de elementos na busca de itens**
  - Causa: Dropdown inline colidindo com outros elementos
  - Solução: Implementação de modal dedicado

- **Testes Unitários**
  - Corrigido `test_criar_item_lista_mae` para nova estrutura de catálogo global
  - Substituído `get_test_users()` por `get_all_users()` nos testes
  - Atualizado `test_criar_lista_com_itens` para usar `ListaItemRef`
  - **Resultado:** 79/79 testes passando ✓

## Estatísticas da Release

- **Commits:** 10+ commits relacionados a listas rápidas
- **Arquivos Modificados:** 15+ arquivos
- **Testes:** 79 testes passando (100%)
- **Cobertura:** Backend e Frontend

## Branches

- **develop:** Branch de desenvolvimento (todas as features integradas)
- **lista-rapida:** Branch de feature (merged para develop)
- **master:** Branch de produção (aguardando merge)

## Notas de Deploy

### Migrações de Banco de Dados

Execute as seguintes migrações antes do deploy:

```bash
cd backend
flask db upgrade
```

### Variáveis de Ambiente

Nenhuma nova variável de ambiente é necessária.

### Dependências

Nenhuma nova dependência adicionada. Todas já estavam presentes:
- Backend: Flask, SQLAlchemy, Flask-JWT-Extended
- Frontend: React, FontAwesome, React Bootstrap

---

**Data da Release:** 2024-12-28

**Desenvolvedores:**
- 🤖 Claude Code (Anthropic)
- 👨‍💻 Andrew Devos
