● ✅ IMPLEMENTAÇÃO COMPLETA: BOTÕES DE LOGIN NA ROTA /admin/restaurantes

  Adicionei dois botões na tabela de gerenciamento de restaurantes para facilitar o compartilhamento de credenciais:

  🎯 O QUE FOI IMPLEMENTADO:

  1. Botão "Login" na Tabela

  - Novo botão em cada linha da tabela (antes dos botões Editar e Deletar)
  - Ícone de cópia (📋) para identificar a ação
  - Variante visual: outline-info (azul)

  2. Modal de Credenciais

  Quando você clica no botão "Login", abre um modal mostrando:
  - 📧 Email (Login) do admin
  - 🔑 Senha Padrão (gerada quando aprovado)
  - 🌐 URL de Acesso: https://kaizen-compras.up.railway.app

  3. Botão "Copiar Login"

  - Copia Email: xxx + Senha: xxx para o clipboard
  - Exibe aviso verde: "✅ Copiado para clipboard!"
  - Timeout de 3 segundos no aviso

  4. Botão "Compartilhar"

  - Abre WhatsApp Web com mensagem formatada
  - Mensagem inclui:
    - Título: Nome do restaurante
    - Email: Credencial de login
    - Senha: Credencial de acesso
    - URL: Link de produção
    - Instruções: Aviso para usar as credenciais
  - Abre em nova aba do navegador

  ---
  📋 MUDANÇAS NO CÓDIGO:

  Frontend (GerenciarRestaurantes.tsx):
  - ✅ Importou FontAwesome icons (faCopy, faWhatsapp)
  - ✅ Adicionou estados para modal de credenciais
  - ✅ Função handleShowCredentialsModal() - abre o modal
  - ✅ Função handleCopyCredentials() - copia para clipboard
  - ✅ Função handleShareWhatsApp() - abre WhatsApp
  - ✅ Novo modal com 3 campos de informação
  - ✅ URL de produção configurável na constante PRODUCTION_URL

  Backend (services.py):
  - ✅ Modificou listar_restaurantes()
  - ✅ Busca email do admin associado ao restaurante
  - ✅ Busca senha na tabela solicitacoes_restaurante (coluna senha_gerada)
  - ✅ Retorna usuario_admin_email e usuario_admin_senha junto com restaurantes

  ---
  🚀 COMO USAR:

  1. Faça pull das mudanças:
  git pull origin cadastro-restaurante
  2. Reinicie o frontend:
  cd frontend
  npm start
  3. Na rota /admin/restaurantes:
    - Clique no botão azul "Login" em qualquer linha
    - Modal abre mostrando email, senha e URL
    - Clique "Copiar Login" para copiar as credenciais
    - Ou clique "Compartilhar" para abrir WhatsApp

  ---
  💾 INFORMAÇÕES ARMAZENADAS:

  - Email do Admin: Vem da tabela usuarios (coluna email)
  - Senha: Vem da tabela solicitacoes_restaurante (coluna senha_gerada)
    - Gerada como string aleatória de 12 caracteres quando a solicitação é aprovada
    - Armazenada para fins de referência/compartilhamento

  ---
  📲 FORMATO DA MENSAGEM WHATSAPP:

  *Credenciais de Acesso - Nome do Restaurante*

  📧 Email: admin@email.com
  🔑 Senha: AbC123XyZ456

  🌐 Acesso: https://kaizen-compras.up.railway.app

  Utilize essas credenciais para acessar o sistema Kaizen Lists.

  ---
  ✨ MELHORIAS FUTURAS OPCIONAIS:

  Se quiser melhorar ainda mais:
  1. Regenerar senha (gerar nova e salvar no banco)
  2. Enviar credenciais por email automaticamente
  3. Histórico de compartilhamentos
  4. QR Code com link de login pré-preenchido

  ---
  Status: PRONTO PARA PRODUÇÃO ✅
