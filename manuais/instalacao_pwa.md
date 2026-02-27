✨Botão de Instalação do Aplicativo (PWA)
📄 Descrição da Melhoria
Atualmente, o sistema é acessado exclusivamente via navegador, sem oferecer ao usuário um meio simples e direto de instalar a aplicação como atalho no desktop ou na tela inicial de dispositivos móveis.

Para atender ao requisito do edital, é necessário disponibilizar um botão claro e acessível na tela inicial, permitindo que o usuário instale a aplicação diretamente via navegador, sem depender de instruções manuais.

🎯 Objetivo
Facilitar o acesso ao sistema
Permitir instalação como atalho/app em:
Android
iOS
Windows
macOS
Linux
Padronizar a experiência de uso como aplicação instalada
Atender ao requisito de compatibilidade multiplataforma
📍 Onde Ocorre
Tela: Tela inicial (Dashboard)
Elemento: Botão de ação para instalação do aplicativo
✅ Comportamento Esperado
Deve existir um botão visível na tela inicial, por exemplo:
“Instalar aplicativo”
“Adicionar à tela inicial”
Ao clicar no botão:
O sistema deve acionar o prompt nativo do navegador para instalação
O usuário deve receber uma confirmação visual
A aplicação deve ser instalada como:
Atalho no desktop (Windows, macOS, Linux)
App/atalho na tela inicial (Android e iOS)
O comportamento deve ser automático, sem exibir passo a passo manual ao usuário
O botão deve aparecer apenas quando:
O navegador suportar a instalação
A aplicação ainda não estiver instalada
❌ Comportamento Atual
Não existe botão para instalação do aplicativo
O usuário precisa acessar o sistema sempre pelo navegador
Não há incentivo nem automação para uso como app instalado
🧪 Prompt para Implementação (IA / Dev)
Desenvolva uma funcionalidade de instalação da aplicação como Progressive Web App (PWA).

A implementação deve:

Adicionar um botão na tela inicial do sistema para instalar o aplicativo
Detectar automaticamente se o ambiente suporta instalação PWA
Utilizar APIs nativas do navegador, como:
beforeinstallprompt (Chrome, Edge, Android)
Exibir o prompt de instalação nativo ao clicar no botão
Após confirmação do usuário:
Criar atalho no desktop (Windows, macOS, Linux)
Criar app/atalho na tela inicial (Android, iOS)
Ocultar o botão caso:
O app já esteja instalado
O navegador não suporte instalação
Exibir mensagem informativa quando a instalação não for suportada
A solução deve ser compatível com:

Android
iOS
Windows
macOS
Linux
O processo deve ser simples, direto e sem instruções manuais.

🛠️ Sugestão Técnica

Configurar corretamente manifest.json

Configurar service worker

Implementar listener do beforeinstallprompt

Criar controle de estado para app instalado

Garantir UX clara e acessível
🖥️ Ambiente
Plataformas: Web, Mobile, Desktop
Dispositivos: Desktop, Tablet, Smartphone
Navegadores: Chrome, Edge, Safari, Firefox (com limitações)
📊 Prioridade

Baixa

Média

Alta

Bloqueante
ℹ️ Observações
Essa melhoria contribui diretamente para:

Adoção do sistema
Experiência do usuário
Conformidade com o edital
Uso do sistema como aplicação instalada (sem dependência de app store)







sugestao de açao

Correção Implementada
O que foi feito
1. Service Worker (PWA)

Criado public/sw.js com estrategia network-first
Cache de assets estaticos (icones) para suporte offline basico
Requisicoes de API sempre vao direto ao servidor (sem cache)
Limpeza automatica de caches antigos na ativacao
2. Manifest melhorado

Atualizado nome para "Vigie Editais - Cestas de Compras"
start_url aponta para /dashboard (tela inicial pos-login)
theme_color usando azul govbr (#1351B4) do design system
Adicionados icones maskable para Android
Adicionadas categorias (business, finance, government)
Orientacao any para suporte landscape/portrait
3. Hook usePWAInstall

Detecta automaticamente suporte do navegador via beforeinstallprompt
Detecta se app ja esta instalado (modo standalone)
Detecta iOS Safari e exibe instrucoes manuais
Controla visibilidade do botao (so mostra quando pode instalar)
Listener para evento appinstalled para ocultar botao apos instalacao
4. Componente InstallAppButton

Botao com icone de download e texto "Instalar aplicativo"
Estilizado com cores govbr (borda e texto azul)
Responsivo: texto completo em desktop, "Instalar" em mobile
No Chrome/Edge: aciona prompt nativo de instalacao
No iOS Safari: exibe dialog com instrucoes passo-a-passo (Compartilhar > Adicionar a Tela)
Toast de confirmacao apos instalacao bem-sucedida
5. Registro do Service Worker

Componente ServiceWorkerRegister no layout raiz
Registro apos page load para nao atrasar carregamento
Deteccao automatica de atualizacoes
Arquivos criados
apps/frontend/public/sw.js - Service Worker
apps/frontend/features/dashboard/hooks/usePWAInstall.ts - Hook de instalacao
apps/frontend/features/dashboard/components/install-app-button.tsx - Botao de instalacao
apps/frontend/features/shell/components/sw-register.tsx - Registro do SW
Arquivos alterados
apps/frontend/app/manifest.ts - Manifest PWA melhorado
apps/frontend/app/layout.tsx - Adicionado ServiceWorkerRegister
apps/frontend/app/dashboard/page.tsx - Adicionado InstallAppButton no header
apps/frontend/features/dashboard/components/index.ts - Export do InstallAppButton
apps/frontend/features/shell/components/index.ts - Export do ServiceWorkerRegister
apps/frontend/features/shell/index.ts - Export do ServiceWorkerRegister
Verificacao
Botao visivel na tela inicial do dashboard (ao lado do filtro de periodo)
Manifest servido corretamente em /manifest.webmanifest
Service worker servido corretamente em /sw.js
Sem erros no console
Testado em localhost:3000 com Chrome
Compatibilidade
Plataforma	Comportamento
Chrome/Edge (Desktop)	Prompt nativo de instalacao
Chrome (Android)	Prompt nativo de instalacao
Safari (iOS)	Dialog com instrucoes manuais
Firefox	Botao oculto (sem suporte nativo)
App ja instalado	Botao oculto automaticamente
Aguardando
Commit sera feito manualmente pelo desenvolvedor.


Ricardo-Dinucci
moved this from Ready to In review in  Cestas de Preços - Bug Tracker3 weeks ago
AndrewDevos1
AndrewDevos1 commented 3 weeks ago
AndrewDevos1
3 weeks ago
Collaborator
Author
"Por favor, me explique exatamente onde o botão de instalação deveria aparecer na interface, e quais condições precisam ser atendidas para ele ficar visível. Detalhe também se existe algum log ou indicador no console ou em variáveis de estado que me permita verificar se a instalação PWA está sendo detectada. Assim, poderei testar corretamente o fluxo."


AndrewDevos1
moved this from In review to Ready in  Cestas de Preços - Bug Tracker3 weeks ago
Ricardo-Dinucci
Ricardo-Dinucci commented 3 weeks ago
Ricardo-Dinucci
3 weeks ago
Owner
Resposta ao Feedback - Detalhes do Botao de Instalacao PWA
1. Onde o botao aparece na interface
O botao "Instalar aplicativo" aparece no header do Dashboard (/dashboard), na mesma linha do titulo "Bem-vindo(a)". Especificamente, ele fica posicionado a esquerda do filtro de Periodo e do badge de role (Super Admin / Administrador / Usuario).

Arquivo: apps/frontend/app/dashboard/page.tsx (linha 48)
Componente: apps/frontend/features/dashboard/components/install-app-button.tsx

Layout visual:

[Bem-vindo(a), Nome]     [Instalar aplicativo] [Periodo v] [Super Admin]
[Municipio - UF]
2. Condicoes para o botao ficar visivel
O botao so aparece quando canShow === true, o que acontece em duas situacoes:

Condicao	Estado	Botao
Navegador disparou evento beforeinstallprompt	installable	Visivel - aciona prompt nativo
iOS Safari detectado	ios-safari	Visivel - exibe dialog com instrucoes manuais
App ja esta instalado (modo standalone)	installed	Oculto
Navegador nao suporta / timeout de 3s	unsupported	Oculto
Verificando (primeiros 3s)	loading	Oculto
Requisitos para o beforeinstallprompt ser disparado pelo Chrome:

Pagina servida via HTTPS (ou localhost em alguns casos)
Manifest valido com name, icons, start_url, display
Service Worker registrado e ativo
App nao esta ja instalado
Usuario nao recusou a instalacao recentemente
3. Logs de debug no console (ADICIONADOS)
Adicionei logs detalhados no hook usePWAInstall.ts com o prefixo [PWA Install]. Para verificar:

Abra o DevTools (F12) > aba Console
Filtre por [PWA Install]
Navegue para /dashboard
Logs que voce vera (sequencia):

[PWA Install] Verificando ambiente: {isStandalone: false, protocol: "http:", hostname: "localhost", ...}
[PWA Install] Deteccao de plataforma: {isIOS: false, isSafari: false}
[PWA Install] Aguardando evento 'beforeinstallprompt'... (timeout de 3s)
[PWA Install] NOTA: Em localhost (HTTP), o Chrome pode NAO disparar o evento.
[PWA Install] Estado atualizado: {state: "loading", canShow: false, ...}
Se o evento for recebido (HTTPS ou localhost com suporte):

[PWA Install] Evento 'beforeinstallprompt' recebido! Botao VISIVEL.
[PWA Install] Estado atualizado: {state: "installable", canShow: true, ...}
Se o timeout de 3s for atingido sem o evento:

[PWA Install] Timeout de 3s atingido. Evento 'beforeinstallprompt' NAO recebido.
[PWA Install] Estado: 'unsupported'. Botao ficara OCULTO.
[PWA Install] Possiveis causas:
[PWA Install]   1. Navegador nao suporta PWA install prompt (ex: Firefox)
[PWA Install]   2. App ja esta instalado
[PWA Install]   3. Pagina servida via HTTP (precisa HTTPS para PWA)
[PWA Install]   4. Manifest invalido ou Service Worker nao registrado
4. Como testar
Opcao A - Via HTTPS (tunnel):
Acesse https://app.vigieeditais.com.br/dashboard no Chrome. O evento beforeinstallprompt sera disparado e o botao aparecera.

Opcao B - Via localhost:
Em http://localhost:3000/dashboard, o Chrome pode disparar o evento (localhost e tratado como contexto seguro). Nos testes locais, o evento foi recebido com sucesso e o botao apareceu normalmente.

Opcao C - Forcar via chrome://flags:

Acesse chrome://flags
Busque "Bypass App Banner Engagement Checks"
Ative a flag e reinicie o Chrome
5. Verificacao realizada
Testei agora em localhost:3000 e confirmei:

Os 15 logs [PWA Install] apareceram corretamente no console
O evento beforeinstallprompt foi recebido
O botao "Instalar aplicativo" ficou visivel no header do dashboard
Estado final: {state: "installable", canShow: true}
Arquivo alterado
apps/frontend/features/dashboard/hooks/usePWAInstall.ts - Adicionados console.log de debug com prefixo [PWA Install]

Ricardo-Dinucci
moved this from Ready to In review in  Cestas de Preços - Bug Tracker3 weeks ago

AndrewDevos1
moved this from In review to Done in  Cestas de Preços - Bug Tracker3 weeks ago

AndrewDevos1
closed this as completedby moving to Done in  Cestas de Preços - Bug Tracker3 weeks ago

