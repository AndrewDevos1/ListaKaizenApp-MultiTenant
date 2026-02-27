> qual e o fluxo na tela?
 ● Vou explicar o fluxo completo na tela passo a passo:

   -------------------------------------------------------------------------------

   📱 FLUXO COMPLETO - SISTEMA DE SUGESTÕES

   👤 PARTE 1: COLABORADOR (Sugerir Item)

   1. Colaborador faz login → vai para dashboard

     http://localhost:3000/collaborator

   2. No menu lateral, clica em:

     MINHAS ATIVIDADES → Minhas Listas

   3. Escolhe uma lista e clica em "Gerenciar Estoque"

     http://localhost:3000/collaborator/listas/2/estoque

   4. Na tela de estoque, no topo da página (ao lado do título), vê:

     ┌──────────────────────────────────────────────┐
     │ 🛒 Preenchimento: Lista X    [🔆 Sugerir Novo Item] │
     └──────────────────────────────────────────────┘

   5. Clica no botão "🔆 Sugerir Novo Item"

   6. Abre um MODAL (janela popup) com formulário:

     ┌─────── Sugerir Novo Item ──────┐
     │                                 │
     │ 📝 Nome do Item *               │
     │ [_____________________]         │
     │                                 │
     │ 📦 Unidade (opcional)           │
     │ [_____________________]         │
     │ Se não informar, o admin define │
     │                                 │
     │ 🔢 Quantidade (opcional)        │
     │ [_____________________]         │
     │ Se não informar, o admin define │
     │                                 │
     │ 💬 Mensagem ao Admin (opcional) │
     │ [_____________________]         │
     │ [_____________________]         │
     │                                 │
     │    [Cancelar]  [✉️ Enviar]     │
     └─────────────────────────────────┘

   7. Preenche apenas o nome do item (ex: "Açúcar Mascavo") e opcionalmente
   mensagem

   8. Clica em "Enviar Sugestão"

   9. Modal fecha e aparece mensagem verde no topo:

     ✅ Sugestão enviada com sucesso! O administrador irá analisá-la.

   10. Para acompanhar, vai no menu:

     MINHAS ATIVIDADES → Minhas Sugestões

   11. Vê tabela com suas sugestões:

     ┌──────────┬────────────┬────────┬──────────────────┐
     │ Lista    │ Item       │ Status │ Resposta Admin   │
     ├──────────┼────────────┼────────┼──────────────────┤
     │ Lista X  │ Açúcar...  │ ⏳ Pend│ -                │
     └──────────┴────────────┴────────┴──────────────────┘

   -------------------------------------------------------------------------------

   👨‍💼 PARTE 2: ADMIN (Aprovar/Rejeit

   1. Admin faz login → vai para dashboard admin

     http://localhost:3000/admin

   2. No menu lateral, clica em:

     LISTAS & ESTOQUE → Sugestões de Itens

   Ou acessa direto:

     http://localhost:3000/admin/sugestoes

   3. Vê tela com badge de contagem e tabela:

     ┌─── Gerenciar Sugestões de Itens ───┐
     │                      [🔵 1 pendente(s)] │
     │                                         │
     │ ┌───────────────────────────────────┐ │
     │ │ Usuário │ Lista │ Item │ Mensagem│ │
     │ ├─────────┼───────┼──────┼─────────┤ │
     │ │ João    │ X     │ Açúcar│ Preciso│ │
     │ │         │       │ Masc. │ p/recei│ │
     │ │         │       │       │ [✅Aprovar] [❌Rejeitar] │
     │ └───────────────────────────────────┘ │
     └─────────────────────────────────────────┘

   4. Admin clica em "✅ Aprovar"

   5. Abre MODAL de Aprovação:

     ┌─────── Aprovar Sugestão ──────────┐
     │ ℹ️ Você está aprovando: Açúcar Mascavo │
     │                                    │
     │ 📦 Unidade *                       │
     │ [kg____]                           │
     │                                    │
     │ 🔢 Quantidade *                    │
     │ [5_____]                           │
     │                                    │
     │ 💬 Mensagem ao usuário (opcional)  │
     │ [Item aprovado!_________]          │
     │ [_________________________]        │
     │                                    │
     │    [Cancelar]  [✅ Confirmar]      │
     └────────────────────────────────────┘

   6. Admin preenche unidade e quantidade (obrigatório)

   7. Clica em "Confirmar Aprovação"

   8. Modal fecha, sugestão sai da lista (foi aprovada)

   9. O que aconteceu nos bastidores:

     - ✅ Item "Açúcar Mascavo" adicionado ao Catálogo Global
     - ✅ Item adicionado à Lista do colaborador com qtd mínima 5kg
     - ✅ Status mudou para "aprovada"

   -------------------------------------------------------------------------------

   👤 PARTE 3: COLABORADOR (Vê Resposta)

   1. Colaborador volta em:

     MINHAS ATIVIDADES → Minhas Sugestões

   2. Agora vê:

     ┌──────────┬────────────┬────────┬──────────────────┐
     │ Lista    │ Item       │ Status │ Resposta Admin   │
     ├──────────┼────────────┼────────┼──────────────────┤
     │ Lista X  │ Açúcar     │ ✅ Apr │ "Item aprovado!" │
     │          │ Mascavo    │ ovada  │ 27/12/2024       │
     └──────────┴────────────┴────────┴──────────────────┘

   3. Volta para sua lista:

     /collaborator/listas/2/estoque

   4. Agora Açúcar Mascavo aparece na tabela de itens! 🎉

   -------------------------------------------------------------------------------

   🔄 RESUMO DO FLUXO:

     Colaborador                 Admin                  Resultado
         │                         │                        │
         ├─ Sugere item            │                        │
         │  (só nome)              │                        │
         │                         │                        │
         │                    ├─ Vê sugestão               │
         │                    │   pendente                  │
         │                    │                             │
         │                    ├─ Define unidade             │
         │                    │   e quantidade              │
         │                    │                             │
         │                    ├─ Aprova                     │
         │                         │                        │
         ├─ Recebe notif      ├───────────────────►  Item no catálogo
         │   "Aprovado!"           │                  Item na lista
         │                         │                        │
         ├─ Vê item na lista       │                        │
         └─────────────────────────┴────────────────────────┘

   Está mais claro agora? Quer que eu crie um vídeo ou GIF demonstrando?

 ~/Codigos-vscode/ListaKaizenApp[⎇ develop]                                     