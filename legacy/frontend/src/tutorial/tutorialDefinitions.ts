export type TutorialRole = 'ADMIN' | 'SUPER_ADMIN' | 'COLLABORATOR';

export interface TutorialDefinition {
    key: string;
    match: RegExp;
    title: string;
    steps: string[];
    roles?: TutorialRole[];
}

const adminRoles: TutorialRole[] = ['ADMIN', 'SUPER_ADMIN'];
const collaboratorRoles: TutorialRole[] = ['COLLABORATOR'];

export const tutorialDefinitions: TutorialDefinition[] = [
    // Admin
    {
        key: 'admin.dashboard',
        match: /^\/admin$/,
        title: 'Dashboard Administrativo',
        steps: [
            'Acompanhe os indicadores principais do sistema.',
            'Use os atalhos para acessar funções frequentes.',
            'Organize os cards conforme sua necessidade.'
        ],
        roles: adminRoles,
    },
    {
        key: 'admin.dashboard.global',
        match: /^\/admin\/global$/,
        title: 'Dashboard Global',
        steps: [
            'Compare resultados entre restaurantes.',
            'Identifique tendências e gargalos rapidamente.',
            'Use os filtros para aprofundar a análise.'
        ],
        roles: ['SUPER_ADMIN'],
    },
    {
        key: 'admin.lista-rapida.criar',
        match: /^\/admin\/lista-rapida\/criar$/,
        title: 'Criar Lista Rápida',
        steps: [
            'Selecione itens e defina prioridades.',
            'Adicione observações quando necessário.',
            'Envie a lista para análise.'
        ],
        roles: adminRoles,
    },
    {
        key: 'admin.listas-rapidas',
        match: /^\/admin\/listas-rapidas$/,
        title: 'Listas Rápidas',
        steps: [
            'Revise listas pendentes enviadas pelos colaboradores.',
            'Aprove ou rejeite conforme a necessidade.',
            'Acesse detalhes para editar itens.'
        ],
        roles: adminRoles,
    },
    {
        key: 'admin.listas-rapidas.detalhe',
        match: /^\/admin\/listas-rapidas\/\d+$/,
        title: 'Detalhes da Lista Rápida',
        steps: [
            'Veja os itens e prioridades solicitadas.',
            'Reverta ou converta para checklist quando aplicável.',
            'Compartilhe a lista quando necessário.'
        ],
        roles: adminRoles,
    },
    {
        key: 'admin.listas-compras',
        match: /^\/admin\/listas-compras$/,
        title: 'Listas de Compras',
        steps: [
            'Crie e organize listas de compras.',
            'Importe e exporte dados quando necessário.',
            'Acesse detalhes para ajustar itens.'
        ],
        roles: adminRoles,
    },
    {
        key: 'admin.lista-mae',
        match: /^\/admin\/listas\/\d+\/lista-mae$/,
        title: 'Lista Mãe Consolidada',
        steps: [
            'Visualize itens consolidados por lista.',
            'Ajuste quantidades e prioridades.',
            'Prepare a base para compras.'
        ],
        roles: adminRoles,
    },
    {
        key: 'admin.gerenciar-itens',
        match: /^\/admin\/listas\/\d+\/gerenciar-itens$/,
        title: 'Gerenciar Itens da Lista',
        steps: [
            'Atualize quantidades mínimas e atuais.',
            'Adicione ou remova itens conforme a operação.',
            'Salve para refletir no estoque.'
        ],
        roles: adminRoles,
    },
    {
        key: 'admin.catalogo-global',
        match: /^\/admin\/catalogo-global$/,
        title: 'Catálogo Global',
        steps: [
            'Cadastre e mantenha itens globais.',
            'Edite unidades e informações básicas.',
            'Garanta consistência entre as listas.'
        ],
        roles: adminRoles,
    },
    {
        key: 'admin.submissoes',
        match: /^\/admin\/submissoes$/,
        title: 'Gerenciar Submissões',
        steps: [
            'Filtre por status para encontrar submissões.',
            'Entre em detalhes para aprovar ou rejeitar.',
            'Arquive submissões concluídas para organizar a lista.'
        ],
        roles: adminRoles,
    },
    {
        key: 'admin.submissoes.detalhe',
        match: /^\/admin\/submissoes\/\d+$/,
        title: 'Detalhes da Submissão',
        steps: [
            'Confira itens, quantidades e status.',
            'Aprove, rejeite ou reverta decisões.',
            'Converta em checklist quando necessário.'
        ],
        roles: adminRoles,
    },
    {
        key: 'admin.checklists',
        match: /^\/admin\/checklists$/,
        title: 'Checklists de Compras',
        steps: [
            'Acompanhe checklists em andamento.',
            'Abra detalhes para marcar itens.',
            'Conclua e compartilhe quando pronto.'
        ],
        roles: adminRoles,
    },
    {
        key: 'admin.checklists.detalhe',
        match: /^\/admin\/checklists\/\d+$/,
        title: 'Detalhes do Checklist',
        steps: [
            'Marque itens concluídos.',
            'Revise observações e fornecedores.',
            'Finalize quando tudo estiver pronto.'
        ],
        roles: adminRoles,
    },
    {
        key: 'admin.sugestoes',
        match: /^\/admin\/sugestoes$/,
        title: 'Sugestões de Itens',
        steps: [
            'Avalie sugestões enviadas pelos colaboradores.',
            'Aprove ou rejeite com base no catálogo.',
            'Mantenha o catálogo sempre atualizado.'
        ],
        roles: adminRoles,
    },
    {
        key: 'admin.areas',
        match: /^\/admin\/areas$/,
        title: 'Áreas',
        steps: [
            'Cadastre e organize áreas de estoque.',
            'Defina responsáveis quando necessário.',
            'Mantenha a estrutura clara para os colaboradores.'
        ],
        roles: adminRoles,
    },
    {
        key: 'admin.gerenciar-usuarios',
        match: /^\/admin\/gerenciar-usuarios$/,
        title: 'Gerenciar Usuários',
        steps: [
            'Aprove, edite ou desative usuários.',
            'Ajuste perfis e permissões.',
            'Mantenha o acesso seguro.'
        ],
        roles: adminRoles,
    },
    {
        key: 'admin.users',
        match: /^\/admin\/users$/,
        title: 'Usuários',
        steps: [
            'Visualize a lista completa de usuários.',
            'Acesse detalhes para editar permissões.',
            'Crie novos usuários quando necessário.'
        ],
        roles: adminRoles,
    },
    {
        key: 'admin.users.new',
        match: /^\/admin\/users\/new$/,
        title: 'Criar Usuário',
        steps: [
            'Preencha os dados obrigatórios do usuário.',
            'Defina o perfil e restaurante.',
            'Salve para ativar o acesso.'
        ],
        roles: adminRoles,
    },
    {
        key: 'admin.fornecedores',
        match: /^\/admin\/fornecedores$/,
        title: 'Fornecedores',
        steps: [
            'Cadastre e mantenha fornecedores atualizados.',
            'Acesse detalhes para visualizar pedidos.',
            'Use as exportações quando necessário.'
        ],
        roles: adminRoles,
    },
    {
        key: 'admin.fornecedores.detalhe',
        match: /^\/admin\/fornecedores\/\d+\/detalhes$/,
        title: 'Detalhes do Fornecedor',
        steps: [
            'Veja pedidos e histórico do fornecedor.',
            'Compartilhe informações de contato.',
            'Ajuste dados quando necessário.'
        ],
        roles: adminRoles,
    },
    {
        key: 'admin.gerar-cotacao',
        match: /^\/admin\/gerar-cotacao$/,
        title: 'Gerar Cotação',
        steps: [
            'Selecione o fornecedor e itens da cotação.',
            'Revise quantidades e unidades.',
            'Gere o documento para envio.'
        ],
        roles: adminRoles,
    },
    {
        key: 'admin.cotacoes',
        match: /^\/admin\/cotacoes$/,
        title: 'Cotações',
        steps: [
            'Acompanhe cotações criadas.',
            'Abra detalhes para baixar ou revisar.',
            'Mantenha o histórico organizado.'
        ],
        roles: adminRoles,
    },
    {
        key: 'admin.cotacoes.detalhe',
        match: /^\/admin\/cotacoes\/\d+$/,
        title: 'Detalhes da Cotação',
        steps: [
            'Revise itens e valores da cotação.',
            'Faça download quando necessário.',
            'Atualize informações se preciso.'
        ],
        roles: adminRoles,
    },
    {
        key: 'admin.configuracoes',
        match: /^\/admin\/configuracoes$/,
        title: 'Configurações',
        steps: [
            'Ajuste preferências e tempo de sessão.',
            'Ative o modo tutorial quando precisar.',
            'Use as opções avançadas com cuidado.'
        ],
        roles: adminRoles,
    },
    {
        key: 'admin.editar-perfil',
        match: /^\/admin\/editar-perfil$/,
        title: 'Editar Perfil',
        steps: [
            'Atualize seus dados pessoais.',
            'Revise informações de contato.',
            'Salve as alterações ao finalizar.'
        ],
        roles: adminRoles,
    },
    {
        key: 'admin.mudar-senha',
        match: /^\/admin\/mudar-senha$/,
        title: 'Mudar Senha',
        steps: [
            'Informe a senha atual e a nova senha.',
            'Use uma senha forte para segurança.',
            'Salve para atualizar o acesso.'
        ],
        roles: adminRoles,
    },
    {
        key: 'admin.restaurantes',
        match: /^\/admin\/restaurantes$/,
        title: 'Restaurantes',
        steps: [
            'Cadastre e gerencie restaurantes.',
            'Acompanhe status e configurações.',
            'Use filtros para facilitar a busca.'
        ],
        roles: ['SUPER_ADMIN'],
    },
    {
        key: 'admin.gerenciar-pedidos',
        match: /^\/admin\/gerenciar-pedidos$/,
        title: 'Gerenciar Pedidos',
        steps: [
            'Visualize pedidos pendentes e aprovados.',
            'Atualize status conforme o andamento.',
            'Mantenha o histórico organizado.'
        ],
        roles: adminRoles,
    },
    {
        key: 'admin.items',
        match: /^\/admin\/items$/,
        title: 'Itens do Sistema',
        steps: [
            'Gerencie itens cadastrados.',
            'Edite unidades e descrições.',
            'Garanta o padrão do catálogo.'
        ],
        roles: adminRoles,
    },

    // Colaborador
    {
        key: 'collaborator.dashboard',
        match: /^\/collaborator$/,
        title: 'Dashboard do Colaborador',
        steps: [
            'Veja suas atividades recentes.',
            'Acesse atalhos para tarefas comuns.',
            'Acompanhe seus indicadores principais.'
        ],
        roles: collaboratorRoles,
    },
    {
        key: 'collaborator.lista-rapida.criar',
        match: /^\/collaborator\/lista-rapida\/criar$/,
        title: 'Criar Lista Rápida',
        steps: [
            'Escolha itens e prioridades.',
            'Adicione observações quando necessário.',
            'Envie a lista para aprovação.'
        ],
        roles: collaboratorRoles,
    },
    {
        key: 'collaborator.minhas-listas',
        match: /^\/collaborator\/listas$/,
        title: 'Minhas Listas de Compras',
        steps: [
            'Acompanhe suas listas atribuídas.',
            'Abra o estoque para atualizar quantidades.',
            'Mantenha as informações sempre atualizadas.'
        ],
        roles: collaboratorRoles,
    },
    {
        key: 'collaborator.minhas-submissoes',
        match: /^\/collaborator\/(areas|submissions)$/,
        title: 'Minhas Submissões',
        steps: [
            'Veja o histórico de submissões.',
            'Acompanhe o status de aprovação.',
            'Abra detalhes quando necessário.'
        ],
        roles: collaboratorRoles,
    },
    {
        key: 'collaborator.submissoes.detalhe',
        match: /^\/collaborator\/submissions\/\d+$/,
        title: 'Detalhes da Submissão',
        steps: [
            'Confira os itens enviados.',
            'Veja o status e observações do admin.',
            'Use a tela para acompanhar a resposta.'
        ],
        roles: collaboratorRoles,
    },
    {
        key: 'collaborator.lista-rapida.detalhe',
        match: /^\/collaborator\/lista-rapida\/\d+\/detalhes$/,
        title: 'Detalhes da Lista Rápida',
        steps: [
            'Revise os itens e prioridades.',
            'Compartilhe quando necessário.',
            'Acompanhe o status da lista.'
        ],
        roles: collaboratorRoles,
    },
    {
        key: 'collaborator.lista-rapida.editar',
        match: /^\/collaborator\/lista-rapida\/\d+\/editar$/,
        title: 'Editar Lista Rápida',
        steps: [
            'Ajuste itens e observações.',
            'Atualize prioridades conforme a necessidade.',
            'Salve para reenviar.'
        ],
        roles: collaboratorRoles,
    },
    {
        key: 'collaborator.minhas-listas-rapidas',
        match: /^\/collaborator\/minhas-listas-rapidas$/,
        title: 'Minhas Listas Rápidas',
        steps: [
            'Visualize listas rápidas criadas.',
            'Acompanhe status de aprovação.',
            'Acesse detalhes quando necessário.'
        ],
        roles: collaboratorRoles,
    },
    {
        key: 'collaborator.catalogo',
        match: /^\/collaborator\/catalogo$/,
        title: 'Catálogo Global',
        steps: [
            'Consulte itens disponíveis.',
            'Use a busca para localizar rapidamente.',
            'Verifique unidades e descrições.'
        ],
        roles: collaboratorRoles,
    },
    {
        key: 'collaborator.estoque-area',
        match: /^\/collaborator\/areas\/\d+\/estoque$/,
        title: 'Estoque da Área',
        steps: [
            'Atualize quantidades atuais.',
            'Confirme pedidos necessários.',
            'Salve o estoque ao finalizar.'
        ],
        roles: collaboratorRoles,
    },
    {
        key: 'collaborator.estoque-lista',
        match: /^\/collaborator\/listas\/\d+\/estoque$/,
        title: 'Estoque da Lista',
        steps: [
            'Registre quantidades e necessidades.',
            'Acompanhe pedidos gerados.',
            'Salve as alterações.'
        ],
        roles: collaboratorRoles,
    },
    {
        key: 'collaborator.sugestoes',
        match: /^\/collaborator\/sugestoes$/,
        title: 'Minhas Sugestões',
        steps: [
            'Envie sugestões de novos itens.',
            'Acompanhe o status de aprovação.',
            'Revise feedback do admin.'
        ],
        roles: collaboratorRoles,
    },
    {
        key: 'collaborator.perfil',
        match: /^\/collaborator\/perfil$/,
        title: 'Editar Perfil',
        steps: [
            'Atualize seus dados pessoais.',
            'Revise e salve as alterações.',
            'Mantenha seu perfil atualizado.'
        ],
        roles: collaboratorRoles,
    },
    {
        key: 'collaborator.mudar-senha',
        match: /^\/collaborator\/mudar-senha$/,
        title: 'Mudar Senha',
        steps: [
            'Informe a senha atual.',
            'Defina uma nova senha segura.',
            'Confirme para atualizar.'
        ],
        roles: collaboratorRoles,
    },
    {
        key: 'collaborator.configuracoes',
        match: /^\/collaborator\/configuracoes$/,
        title: 'Configurações',
        steps: [
            'Ative o modo tutorial quando precisar.',
            'Acompanhe seu progresso de aprendizado.',
            'O modo desativa ao completar todas as telas.'
        ],
        roles: collaboratorRoles,
    },
];

const roleMatches = (definition: TutorialDefinition, role: TutorialRole) => {
    if (!definition.roles || definition.roles.length === 0) {
        return true;
    }
    return definition.roles.includes(role);
};

export const getTutorialForPath = (pathname: string, role: TutorialRole) => {
    return tutorialDefinitions.find((definition) => roleMatches(definition, role) && definition.match.test(pathname)) || null;
};

export const getTutorialKeysForRole = (role: TutorialRole) => {
    return tutorialDefinitions
        .filter((definition) => roleMatches(definition, role))
        .map((definition) => definition.key);
};
