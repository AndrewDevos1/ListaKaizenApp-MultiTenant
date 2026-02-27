Plano de Migração dos Módulos Legado

Objetivo
- Migrar, validar e publicar cada módulo do legado React/Nest antigo para o monorepo (Next 15 + Nest 11), com estado funcional e testes mínimos por módulo.

Inventário de Módulos (Front/Back)
- Admin: Dashboard, Listas de Compras (listas + detalhe), Itens, Áreas, Submissões, Sugestões, Lista Rápida, Checklists, POP (Listas/Auditoria/Atividades), Fornecedores/Fornecedores da Região, Gerenciar Usuários, Configurações, Perfil/Senha.
- Colaborador: Dashboard, Minhas Listas (detalhe), Lista Rápida, Submissões, Sugestões, Minhas Listas Rápidas.
- Shared: Auth, Tema, Breadcrumbs, Uploads, Widgets.
- API legado esperado: items, areas, listas, fornecedores, cotacoes, sugestoes, submissions, usuarios.

Prioridades (Ondas)
1) Núcleo já existente: Itens, Áreas, Listas (admin/colab) – garantir paridade e testes de API/UI.
2) Submissões + Sugestões (admin/colab) – requer endpoints e UI de triagem.
3) Lista Rápida / Checklists – workflows curtos e templates.
4) Fornecedores + Fornecedores da Região + Cotações – integrações futuras.
5) POP (Listas/Auditoria/Atividades), Configurações, Gerenciar Usuários, Perfil/Senha.

Critérios de Pronto por Módulo
- API: endpoints Nest com validação DTO, testes Jest (unit + e2e mínimo feliz), seed/migração Prisma.
- Front: página Next funcional, estados loading/erro, formulários com validação, navegação protegida, breadcrumbs.
- Acessibilidade: foco/aria em botões de ação, tooltips claros.
- Observabilidade: logs de erro no console do servidor e toast para o usuário.

Checklist de Implementação (usar em cada módulo)
1) API: model/DTO/service/controller + rota; migrar esquema Prisma; adicionar seeds se necessário.
2) Testes API: Jest unitário para service e e2e básico do endpoint feliz.
3) Client: copiar UI legado como referência; implementar em app router; ligar a API real; estados vazio/erro.
4) Navegação: inserir rota no Sidebar só quando disponível; rotas futuras ficam desabilitadas com “Em breve”.
5) Dados: ajustar serializers/shared types em `packages/shared`; reusar schema onde possível.
6) QA rápido: rodar `npm run lint --workspace=apps/web` (após configurar ESLint) e `npm run test --workspace=apps/api`.

Boas Práticas com IA (para acelerar sem perder rigor)
- Escreva prompts curtos e específicos (“gera handler Nest para POST /v1/sugestoes com DTO X”).
- Sempre revise diffs; não aceite código sem entender side-effects.
- Teste mínimo após cada bloco grande; peça à IA só trechos, não arquivos enormes.
- Mantenha comentários sucintos apenas onde a intenção não é óbvia.

Riscos & Mitigações
- Drift de schema Prisma: rodar `db:generate` e `db:migrate` por módulo.
- Rotas 404: só habilitar links quando a página e API existirem.
- Regressão visual: capturas manuais por módulo até termos Playwright configurado.
