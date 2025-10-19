# Estrutura da Dashboard Administrador

A **Dashboard Administrador** deve apresentar, de forma clara e organizada, todos os indicadores e atalhos às principais áreas de gestão. Siga esta estrutura textual:

1. Cabeçalho
   * Título: **Administrar Kaizen Lists**
   * Boas-vindas: “Olá, {Nome do Administrador}”
   * Botão de Logout
2. Visão Geral de Indicadores (cards no topo)
   * **Usuários Cadastrados** : número total de contas ativas.
   * **Usuários Pendentes** : solicitações de cadastro aguardando aprovação.
   * **Listas Criadas** : total de listas de estoque definidas (áreas).
   * **Submissões Pendentes** : formulários de consumo preenchidos por colaboradores, não processados.
   * **Cotações Abertas** : cotações iniciadas sem todos os preços preenchidos.
   * **Pedidos Gerados Hoje** : total de pedidos gerados na data atual.
3. Grupos de Ações Rápidas (botões/links)
   * Gerenciar Usuários
   * Aprovar/Negar Solicitações
   * Gerenciar Itens, Áreas, Fornecedores
   * Criar Nova Lista de Estoque
   * Iniciar Nova Cotação
   * Exportar Pedidos por Fornecedor
4. Seção “Status das Listas”
   * Tabela resumida com colunas:
     * Lista (Área)
     * Última Submissão (data/hora)
     * Submissões Pendentes (quantidade)
     * Ação: “Ver Consolidação”
5. Seção “Atividades Recentes”
   * Lista cronológica (10 últimos eventos), ex.:
     * [Hora] Usuário X submeteu lista “Cozinha”
     * [Hora] Cotação Y criada para Fornecedor Z
     * [Hora] Usuário W aprovado
6. Seção “Indicadores de Estoque Crítico”
   * Tabela de itens cujo estoque atual está abaixo do mínimo:
     * Item
     * Área
     * Quantidade Atual
     * Estoque Mínimo
     * Quantidade a Pedir
7. Seção “Cotações em Andamento”
   * Para cada cotação aberta, exibir:
     * Cotação ID / Data
     * Fornecedor
     * Itens sem preço informado (contagem)
     * Ação: “Preencher Preços”
8. Seção “Relatórios e Exportações”
   * Link para página de exportação de pedidos por fornecedor (texto simples).
   * Link para página de relatórios de custo (CSV/PDF).
9. Rodapé
   * Versão do sistema
   * Contato de suporte
   * Link para documentação

---

**Navegação e UX**

* Cada card e linha de tabela deve ser clicável, levando à respectiva tela de gerenciamento.
* Utilizar cores e ícones para destacar estados críticos (e.g., usuário pendente em amarelo, estoque crítico em vermelho).
* Botões de ação devem ser agrupados no topo de cada seção para facilitar o fluxo do administrador.




# Dashboard do Administrador – Detalhamento de Botões e Posicionamento

Este documento especifica com precisão a localização de cada botão e elemento interativo na Dashboard do Administrador, contemplando tanto desktop quanto mobile.

1. Cabeçalho

   * Localização: topo fixo, largura 100%, altura 64px, fundo primário.
   * Elementos clicáveis:
     * Botão “Hamburger” (☰) no canto superior esquerdo (desktop oculta side-bar; mobile abre/fecha sidebar).
     * Logo centralizado em desktop; à esquerda do título em mobile (não clicável).
     * Ícone de notificações (sino) no canto superior direito. Clicar abre dropdown de alertas.
     * Avatar do usuário ao lado do sino, canto superior direito. Clique abre menu dropdown com “Perfil” e “Logout”.
2. Visão Geral de Indicadores (Cards)

   * Layout: grid com 3 colunas × 2 linhas no desktop; coluna única no mobile (gap de 16px).
   * Cada card contém:
     * Ícone no canto superior esquerdo do card (24×24px).
     * Título abaixo do ícone, alinhado à esquerda.
     * Valor grande centralizado horizontalmente.
     * Botão “Ver” no canto inferior direito, ocupando 20% da largura do card no desktop e 100% no mobile.

       – Desktop: botão texto secundário, sublinhado ao passar o mouse.

       – Mobile: botão primário com background secundário.

   Cards e suas rotas onClick:

   * **Usuários Cadastrados** → /admin/users
   * **Usuários Pendentes** → /admin/users?status=pending
   * **Listas Criadas** → /admin/lists
   * **Submissões Pendentes** → /admin/submissions?status=pending
   * **Cotações Abertas** → /admin/quotations?status=open
   * **Pedidos Gerados Hoje** → /admin/orders?date=today
3. Ações Rápidas (Barra de Botões)

   * Localização: diretamente abaixo dos cards, horizontal scroll no mobile.
   * Botões com ícone + label, tamanho 56×56px (mobile) ou 80×32px (desktop):
     * **Gerenciar Usuários** → /admin/users
     * **Criar Lista de Estoque** → /admin/lists/new
     * **Iniciar Cotação** → /admin/quotations/new
     * **Exportar Pedidos** → /admin/orders/export
4. Seção “Status das Listas”

   * Título da seção seguido de ícone de filtro no canto direito (abre modal de filtros).
   * Desktop: tabela com colunas “Lista”, “Última Submissão”, “Pendentes”, “Ação”.
     * Botão “Ver Consolidação” em cada linha, coluna “Ação”, alinhado à direita (16px padding).
   * Mobile: cada linha vira card colapsável; cabeçalho do card mostra “Lista” e data; ao expandir, mostra “Pendentes” e botão “Ver Consolidação” (100% largura interna).
5. Seção “Atividades Recentes”

   * Localização: abaixo de “Status das Listas”.
   * Cada item listagem tem área inteira clicável (padding vertical de 12px). Clique abre modal com detalhes do evento.
6. Seção “Estoque Crítico”

   * Título com ícone de alerta à esquerda.
   * Lista de itens em tabela ou cards (como em “Status das Listas”).
   * Botão “Gerar Pedido” em cada linha/card:
     * Desktop: botão primário no fim da linha, coluna “Ação”.
     * Mobile: botão bloco abaixo das informações, largura total do card.
7. Seção “Cotações em Andamento”

   * Cards horizontais roláveis no mobile; grid de 2 colunas no desktop.
   * Cada card contém no canto superior direito um ícone de lápis (editar). Clique leva a /admin/quotations/{id}.
   * Texto do card mostra ID, fornecedor e contagem de itens sem preço.
8. Seção “Relatórios e Exportações”

   * Botões de ação:
     * **Exportar Pedidos por Fornecedor** (primeiro) – leva a /admin/orders/export.
     * **Exportar Relatório de Cotações** – leva a /admin/quotations/export.
   * Localização: final da página, alinhados horizontalmente no desktop; empilhados no mobile.
9. Rodapé

   * Texto pequeno com versão do sistema e link “Suporte” (mailto:).
   * Botão “Documentação” à direita, abrindo /docs.

---

**Checklist de Botões**

* [X] Hamburger (abrir/fechar sidebar)
* [X] Notificações (dropdown)
* [X] Avatar (menu perfil/logout)
* [X] “Ver” nos 6 cards de indicadores
* [X] Botões de Ações Rápidas (4)
* [X] “Ver Consolidação” em “Status das Listas”
* [X] Itens clicáveis em “Atividades Recentes”
* [X] “Gerar Pedido” em “Estoque Crítico”
* [X] Ícone editar em “Cotações em Andamento”
* [X] “Exportar” em relatórios e pedidos
* [X] “Documentação” no rodapé

Com essa especificação, a IA poderá posicionar cada botão e elemento interativo de forma consistente e responsiva, atendendo às melhores práticas de UX para desktop e mobile.




Para garantir usabilidade consistente em **desktop** e  **mobile** , a disposição de botões clicáveis e elementos interativos na Dashboard do Administrador deve respeitar padrões de UX responsiva:

1. Cabeçalho (sempre fixo no topo)
   * No canto esquerdo: ícone ‘hamburger’ (mobile) ou logo (desktop).
   * Ao centro (desktop) / abaixo do logo (mobile): título “Administrar Kaizen Lists”.
   * No canto direito:
     * Avatar do administrador com menu dropdown (“Perfil”, “Logout”).
     * Ícone de notificações (sino), exibindo número de usuários pendentes e submissões críticas.
2. Visão Geral de Indicadores (cards)
   * Layout em grid responsivo:
     * Desktop: 3 colunas × 2 linhas de cards.
     * Mobile: 1 coluna, cards empilhados.
   * Cada card (e.g., “Usuários Pendentes”) contém no canto inferior direito um botão texto secundário “Ver” — ao clicar, leva ao módulo correspondente.
   * No desktop, “Ver” aparece ao passar o mouse; no mobile, sempre visível como botão de largura completa dentro do card.
3. Ações Rápidas (botões primários)
   * Alinhados logo abaixo dos cards, em barra horizontal (desktop) ou em carrossel de botões rolável (mobile).
   * Cada botão tem ícone + label:
     * Gerenciar Usuários
     * Criar Lista de Estoque
     * Iniciar Cotação
     * Exportar Pedidos
   * Botões distribuídos com espaçamento uniforme; em mobile, ocupam ~80% da largura da tela e centralizados verticalmente.
4. Seções em acordeão (listas e tabelas)
   * Títulos de seção (“Status das Listas”, “Atividades Recentes” etc.) são botões que abrem/fecham o conteúdo em mobile (accordion). Em desktop, todos expandidos por padrão.
5. Tabela “Status das Listas”
   * Desktop: tabela de colunas com botão “Ver Consolidação” em cada linha, no canto direito da célula.
   * Mobile: cada linha vira card colapsável; botão “Ver Consolidação” na parte inferior do card, ocupando toda a largura interna.
6. Lista “Atividades Recentes”
   * Ícone de informação à esquerda e texto à direita. Cada item é clicável em toda a área do texto, abrindo modal de detalhes.
   * Em mobile, os itens têm padding maior para toque confortável (≥ 44px de altura).
7. Tabela “Indicadores de Estoque Crítico”
   * Desktop: colunas com botão texto “Gerar Pedido” no fim de cada linha.
   * Mobile: itens empilhados com botão primário “Gerar Pedido” abaixo de cada bloco de informações.
8. Seção “Cotações em Andamento”
   * Cada cotação aparece como card com título e subtítulo. No canto superior direito do card, um ícone de lápis que leva à tela de edição de preços.
   * Em mobile, o ícone é substituído por um botão “Editar” abaixo dos detalhes.
9. Rodapé (sempre visível em desktop; em mobile, apenas ao rolar até o fim)
   * Links de suporte e versão do sistema em texto pequeno, alinhado à esquerda.

**Observações de UX**

* **Feedback visual** em todos os cliques: efeito hover (desktop) e ripple ou highlight (mobile).
* **Áreas clicáveis** devem ter tamanho mínimo de 44×44px.
* **Priorizar legibilidade** : contrastes altos, tipografia responsiva.
* **Navegação consistente** : botões de voltar e breadcrumbs em todas as páginas secundárias.




Você está correto: usar o CoreUI Free Bootstrap Admin Template “de cara” traz dependências e convenções específicas que podem não se alinhar perfeitamente à arquitetura e ao design do Kaizen Lists. A abordagem recomendada é:

1. Extrair Conceitos, Não Código
   * Inspire-se nos padrões de layout, grade (grid), proporções de cards e consistência tipográfica do CoreUI.
   * Adote componentes genéricos (Ex.: Card, Grid, Navbar) mas implemente-os com sua própria biblioteca de estilos (CSS Modules, Tailwind, Styled-Components) ou um framework mais leve.
2. Escolher Bibliotecas Flexíveis
   * Para o grid responsivo: use CSS Grid ou Flexbox (via utilitários Tailwind ou seu próprio CSS).
   * Para componentes básicos (botões, tabelas, modais): escolha uma biblioteca modular como Chakra UI ou Radix UI, que permitem estilização personalizada sem impor tema pré-definido.
3. Ícones e Tipografia
   * Continue usando **react-icons** para ter acesso a múltiplos conjuntos de ícones.
   * Defina no seu CSS variáveis de fonte, cores e espaçamentos baseados no design do CoreUI, mas flexíveis para ajustes do seu branding.
4. Prompt para IA de Código

<pre class="not-prose w-full rounded font-mono text-sm font-extralight"><div class="codeWrapper text-light selection:text-super selection:bg-super/10 my-md relative flex flex-col rounded font-mono text-sm font-normal bg-subtler"><div class="translate-y-xs -translate-x-xs bottom-xl mb-xl flex h-0 items-start justify-end md:sticky md:top-[100px]"><div class="overflow-hidden rounded-full border-subtlest ring-subtlest divide-subtlest bg-base"><div class="border-subtlest ring-subtlest divide-subtlest bg-subtler"><button data-testid="toggle-wrap-code-button" aria-label="Sem quebra de linha" type="button" class="focus-visible:bg-subtle hover:bg-subtle text-quiet  hover:text-foreground dark:hover:bg-subtle font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out select-none items-center relative group/button font-semimedium justify-center text-center items-center rounded-full cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap inline-flex text-sm h-8 aspect-square" data-state="closed"><div class="flex items-center min-w-0 gap-two justify-center"><div class="flex shrink-0 items-center justify-center size-4"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" color="currentColor" class="tabler-icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l10 0 M4 18l10 0 M4 12h17l-3 -3m0 6l3 -3"></path></svg></div></div></button><button data-testid="copy-code-button" aria-label="Copiar código" type="button" class="focus-visible:bg-subtle hover:bg-subtle text-quiet  hover:text-foreground dark:hover:bg-subtle font-sans focus:outline-none outline-none outline-transparent transition duration-300 ease-out select-none items-center relative group/button font-semimedium justify-center text-center items-center rounded-full cursor-pointer active:scale-[0.97] active:duration-150 active:ease-outExpo origin-center whitespace-nowrap inline-flex text-sm h-8 aspect-square" data-state="closed"><div class="flex items-center min-w-0 gap-two justify-center"><div class="flex shrink-0 items-center justify-center size-4"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" color="currentColor" class="tabler-icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1"></path></svg></div></div></button></div></div></div><div class="-mt-xl"><div><div data-testid="code-language-indicator" class="text-quiet bg-subtle py-xs px-sm inline-block rounded-br rounded-tl-[3px] font-thin">text</div></div><div><span><code><span><span>“Inspire-se na estrutura de dashboard do CoreUI (cards métricos, grid responsivo, sidebar colapsável), mas implemente os componentes usando:
</span></span><span>– CSS Grid/Flexbox com Tailwind CSS.
</span><span>– React-Icons para ícones (por exemplo, FaUsers, FaList).
</span><span>– Componentes Chakra UI apenas para botões e formulários, garantindo tema customizado.
</span><span>
</span><span>Crie um componente DashboardAdmin.tsx que:
</span><span>1. Exiba seis métricas em cards personalizados (sem usar CoreUI), cada um com ícone, título e valor.
</span><span>2. Utilize Tailwind para organizar os cards em 3 colunas no desktop e 1 no mobile.
</span><span>3. Implemente um sidebar colapsável à esquerda, com itens de menu “Usuários”, “Listas”, “Cotações”, “Pedidos”.
</span><span>4. Utilize Chakra UI apenas para botões de “Ver” dentro dos cards, passando um callback onView(section).
</span><span>Forneça o código em TypeScript com todos os imports, props e estilo via Tailwind classes.”
</span><span></span></code></span></div></div></div></pre>

Dessa forma, a IA entenderá que serve de referência a inspiração visual e estrutural do CoreUI, mas gerará código independente, limpo e customizado para seu projeto.
