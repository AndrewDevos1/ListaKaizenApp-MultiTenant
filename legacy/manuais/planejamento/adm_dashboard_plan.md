Registro: 2025-10-19 13:46:00 -03:00 (Horário de Brasília, Rio Grande do Sul)

# Planejamento — Dashboard e Barra de Atalhos (Usuário ADM)

Objetivo

- Definir layout padrão e comportamentos da interface administrativa: menu sanduíche, barra de ferramentas (atalhos) e dashboard composto por cards/widgets em grade responsiva.
- Fornecer instruções e especificações para implementação front-end sem executar mudanças no código sem confirmação.

Visão geral do layout

- Topbar (barra superior): logotipo, título da aplicação, campo de busca global (opcional), ícone de notificações, avatar do usuário com menu de conta (Logout / Alterar senha).
- Sidebar (menu sanduíche) colapsável: agrupamentos de navegação primária e secundária.
- Área principal (Dashboard): grade responsiva de cards/widgets; cada card representa uma categoria funcional.

Barra de atalhos (painel superior ou lateral) — itens e comportamento

- Painel de controle (principal): link direto para a página Dashboard (home admin).
  - Ao clicar: navega para /admin/dashboard.
- Atalho "Listas": direciona para a página Conteúdo do dashboard (/admin/conteudo ou /admin/listas).
  - Deve suportar contexto (filtros preservados entre navegações).
- Atalho "Aprovações": direciona para a fila de aprovações (/admin/aprovacoes).
- Ícones/labels: combinar ícone + rótulo curto; na sidebar colapsada mostrar apenas ícone com tooltip.
- Ordem sugerida (top-down): Painel de controle, Listas, Aprovações, Usuários, Relatórios, Integrações, Configurações, Auditoria, Ajuda.
- Estado ativo: destacar item atual (cor e borda). Acesso via teclado (focus) e atalhos rápidos (ex.: G+D para dashboard).

Menu sanduíche — organização e categorias

- Grupo: Visão Geral
  - Dashboard (Painel de controle)
- Grupo: Conteúdo
  - Listas / Itens
  - Categorias / Tags
- Grupo: Fluxos
  - Aprovações
  - Histórico de aprovações
- Grupo: Gestão
  - Usuários
  - Papéis & Permissões
- Grupo: Operações
  - Relatórios
  - Integrações / Webhooks
- Grupo: Sistema
  - Configurações
  - Auditoria (logs)
- Grupo: Suporte
  - Ajuda / Documentação / Suporte
- Comportamento móvel: sidebar vira drawer (full-screen overlay opcional); fechar ao selecionar item.

Dashboard: grade responsiva de cards/widgets

- Layout de grid
  - Desktop largo: 4 colunas
  - Desktop médio / tablet: 2–3 colunas
  - Mobile: 1 coluna
  - Gutter e margens adaptativas
- Cada card tem:
  - Cabeçalho: ícone, título (ex.: "Usuários"), contador principal (ex.: total / pendentes).
  - Corpo: resumo rápido (últimas 3 entradas, gráficos pequenos, badges de status).
  - Ações rápidas (botões compactos): ex.: "+Novo", "Exportar", "Filtrar", "Ver tudo".
  - Footer/links: link "Ir para" que navega para a página correspondente.
  - Estados: loading skeleton, empty state, erro (com retry).
  - Lazy load / quebra por prioridade: cards críticos (Usuários, Aprovações, Conteúdo) carregam primeiro.
- Conteúdo por cartão (sugestão):
  - Usuários: total, novos hoje, pendentes de verificação; ações: criar usuário, gerenciar permissões.
  - Conteúdo (Listas): total de listas, novas, itens sem categoria; ações: criar lista, limpar lixo.
  - Aprovações: itens pendentes, tempo médio de espera; ações: abrir fila, aprovar em massa.
  - Relatórios: últimos relatórios gerados, link para gerar novo; ações: exportar CSV/PDF.
  - Integrações: status das integrações, últimas falhas; ações: reexecutar sync, editar chaves.
  - Configurações: atalhos para configuração crítica (limites, env); ações: abrir painel de configurações.
  - Auditoria: últimos eventos (3 linhas), link para logs detalhados.
  - Ajuda: contatos de suporte, links para docs, criar ticket.
- Widgets opcionais:
  - Gráfico de atividade (últimos 7/30 dias)
  - Lista de tarefas administrativas (to-dos do admin)
  - Indicadores de saúde do sistema (jobs, filas, uso de disco)

Fluxo específico de login/conta

- Avatar/menu de conta:
  - Opção "Alterar senha": abre página ou modal seguro (/account/change-password).
  - Opção "Logout": desloga e redireciona para tela pública de login (/login) com feedback de sucesso.
  - Opção "Perfil": visualizar/editar perfil (nome, email, preferências).
- Segurança:
  - Confirmar logout com um toast; para logout imediato não pedir confirmação extra.
  - Alterar senha exige validação forte e feedback inline.
  - Opcional: 2FA via settings.

Acessibilidade e usabilidade

- Teclas de atalho documentadas e configuráveis.
- Labels ARIA em botões e menus; contrastes conformes WCAG AA.
- Navegação por teclado: sidebar, cards e modais focáveis.
- Feedback visual para ações assíncronas (skeletons, spinners, toasts).

Performance e boas práticas

- Carregamento progressivo: priorizar dados de cards visíveis.
- Paginação / virtual scroll para listas longas.
- Caching de estado para manter filtros/abas ao voltar do detalhe.
- Medir métricas de tempo de carregamento (LCP, FID).

Itens adicionais sugeridos (não obrigatórios)

- Busca global com jump-to (pressione "/").
- Quick-create (botão flutuante) para criar lista/usuário/aprovação rapidamente.
- Modo impersonate para suporte (registrar auditoria).
- Toggle para modo compacto (mais cards por linha).
- Indicador de ambiente (DEV/STAGE/PROD) visível em topo.

Observações finais

- Este documento é um plano detalhado; implemente em etapas e peça confirmação antes de qualquer modificação de código.
- Se desejar, eu adapto este planejamento aos .md de frontend que você mencionou — adicione-os ao working set ou use `#codebase` para leitura automática.
