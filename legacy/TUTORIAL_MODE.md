Modo Tutorial (Wizard por Tela)

Objetivo
- Exibir um tutorial curto na primeira vez que o usuario acessa cada tela.
- O tutorial aparece uma vez por tela e desativa automaticamente ao completar todas.

Como funciona
- O modo tutorial e controlado no frontend por um contexto dedicado.
- Cada rota tem um texto de tutorial com titulo e passos curtos.
- Ao abrir a tela, o overlay aparece se:
  - o modo tutorial estiver ativo
  - a tela ainda nao tiver sido vista

Persistencia
- O estado fica no localStorage por usuario e role:
  - chave: kaizen:tutorial:<userId>:<role>
  - payload: { enabled: boolean, seenScreens: { [key]: true } }

Ativacao e desativacao
- No primeiro acesso (sem estado salvo), o modo inicia ativo automaticamente.
- O usuario pode ativar ou reiniciar em Configuracoes.
- Quando todas as telas do role forem vistas, o modo desativa automaticamente.

Onde configurar
- Admin: /admin/configuracoes (card "Modo Tutorial")
- Colaborador: /collaborator/configuracoes (pagina simples com o mesmo botao)

Componentes principais
- Contexto: frontend/src/context/TutorialContext.tsx
- Overlay: frontend/src/components/TutorialOverlay.tsx
- Controller global: frontend/src/components/TutorialController.tsx
- Definicoes por rota: frontend/src/tutorial/tutorialDefinitions.ts

Como adicionar uma nova tela ao tutorial
1) Adicionar uma entrada em frontend/src/tutorial/tutorialDefinitions.ts
   - key: identificador unico
   - match: regex da rota
   - title: titulo do tutorial
   - steps: lista de 2-4 textos curtos
   - roles: ADMIN/SUPER_ADMIN ou COLLABORATOR
2) Garantir que a rota exista no App e no menu do usuario
3) Testar: ativar tutorial, acessar a tela e confirmar que aparece uma vez

Observacoes
- O tutorial aparece como overlay modal com botao "Entendi".
- Cada tela mostra apenas uma vez, salvo quando o usuario reinicia o modo.
