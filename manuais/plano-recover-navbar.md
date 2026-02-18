Plano de Ajuste da Sidebar (legado → Next)

Contexto
- Após adicionar todos os botões do legado, vários levam a páginas “Em construção”. Precisamos alinhar o menu ao que realmente existe hoje, sem remover a visibilidade do que falta.
- Backend atual expõe apenas: items, areas, listas, auth, restaurantes. Não há endpoints para sugestões, submissões, fornecedores, etc.

Checklist de Rotas (legado vs estado atual)
- Disponíveis hoje (funcionais): /admin/dashboard, /admin/items, /admin/areas, /admin/listas, /admin/listas/[id]; /collaborator/dashboard, /collaborator/listas, /collaborator/listas/[id].
- Ausentes no backend: /admin/submissoes, /admin/gerenciar-usuarios, /admin/itens-regionais, /admin/sugestoes, /admin/lista-rapida, /admin/checklists, /admin/fornecedores, /admin/fornecedores-regiao, /admin/pop-atividades, /admin/pop-auditoria, /admin/pop-listas, /admin/configuracoes, /admin/editar-perfil, /admin/mudar-senha.
- Colaborador ausentes: lista rápida, submissões, sugestões, etc (não migrados).

Plano de Ação
1) Menu consciente de disponibilidade
   - Marcar itens com status `disponivel` ou `indisponivel` (label “Em breve”) e impedir navegação dos indisponíveis.
   - Tooltips deixam claro “Funcional” ou “Em breve”.
2) Limpeza de placeholders
   - Remover páginas “Em construção” criadas só para evitar 404; manter apenas rotas reais.
3) UX de descoberta
   - Exibir os itens faltantes com estado desabilitado para manter visibilidade das entregas pendentes.
   - Versão mantém v3.0.29; breadcrumbs intactos.
4) Documentar dependências
   - Registrar aqui o mapeamento e a lista de lacunas para quando o backend suportar.

Critérios de Pronto
- Nenhum clique em itens “disponíveis” leva para tela vazia.
- Itens “em breve” não navegam e mostram tooltip explicativo.
- Sidebar colapsada/expandida mantém tooltips e acessibilidade (aria-expanded na orelha).
- Placeholder pages removidas do app.
