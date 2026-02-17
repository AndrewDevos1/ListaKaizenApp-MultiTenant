# ✅ Checklist: Conectar Local ao Banco Railway

**Branch:** `conectando-banco-remoto`  
**Data:** 24/12/2025 05:16 BRT  
**Objetivo:** Validar conexão local com PostgreSQL de produção

---

## 📝 Preparação (Fazer UMA vez)

- [ ] **1.1** - Abrir Railway Dashboard e localizar o serviço **Postgres**
- [ ] **1.2** - Copiar o **Postgres Connection URL** da aba Connect
- [ ] **1.3** - Salvar URL em local seguro (não commitar!)

---

## 🔧 Configuração Local

- [ ] **2.1** - Navegar para `backend/` no terminal
- [ ] **2.2** - Criar arquivo `.env` (copiar de `.env.railway-local`)
  ```bash
  cp .env.railway-local .env
  ```
- [ ] **2.3** - Editar `.env` e colar `DATABASE_URL` real do Railway
- [ ] **2.4** - Verificar se `DEV_DATABASE_URL=${DATABASE_URL}` está presente
- [ ] **2.5** - Confirmar que `SECRET_KEY` e `JWT_SECRET_KEY` são iguais aos do Railway

---

## 🐍 Ambiente Python

- [ ] **3.1** - Ativar ambiente virtual
  ```bash
  # Linux/Mac:
  source .venv/bin/activate
  
  # Windows:
  .venv\Scripts\activate
  ```
- [ ] **3.2** - Atualizar dependências
  ```bash
  pip install -r requirements.txt
  ```
- [ ] **3.3** - Verificar se `psycopg2-binary` está instalado
  ```bash
  pip list | grep psycopg2
  ```

---

## 🗄️ Migrações (⚠️ CUIDADO - Banco de Produção!)

- [ ] **4.1** - Verificar status atual das migrações
  ```bash
  flask db current
  ```
- [ ] **4.2** - Ver histórico de migrações
  ```bash
  flask db history
  ```
- [ ] **4.3** - Se necessário, aplicar migrações pendentes
  ```bash
  flask db upgrade
  ```
  ⚠️ **Atenção:** Isso afeta o banco de **PRODUÇÃO**!

---

## 🚀 Iniciar Backend Local

- [ ] **5.1** - Executar o servidor Flask
  ```bash
  python run.py
  ```
- [ ] **5.2** - Confirmar mensagem no console:
  ```
  ✅ Usando PostgreSQL no desenvolvimento
  * Running on http://127.0.0.1:5000
  ```
- [ ] **5.3** - Backend rodando sem erros de conexão

---

## ✅ Testes de Validação

### A) Health Check Básico
- [ ] **6.1** - Testar rota de saúde
  ```bash
  curl http://localhost:5000/api/health
  ```
  **Esperado:**
  ```json
  {"status": "ok", "message": "API is running"}
  ```

### B) Health Check do Banco
- [ ] **6.2** - Testar conexão com banco
  ```bash
  curl http://localhost:5000/api/health/db
  ```
  **Esperado:**
  ```json
  {"database": "connected", "type": "postgresql"}
  ```

### C) Verificar Dados Existentes
- [ ] **6.3** - Abrir console Python e contar registros
  ```python
  from kaizen_app import create_app
  from kaizen_app.extensions import db
  from kaizen_app.models import User, Collaborator, List
  
  app = create_app()
  with app.app_context():
      print(f"Usuários: {User.query.count()}")
      print(f"Colaboradores: {Collaborator.query.count()}")
      print(f"Listas: {List.query.count()}")
  ```

### D) Testar Autenticação
- [ ] **6.4** - Fazer login com usuário admin
  ```bash
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@kaizen.com","password":"admin123"}'
  ```
  **Esperado:** Retornar `access_token`

- [ ] **6.5** - Salvar o token retornado
  ```bash
  TOKEN="cole_aqui_o_access_token_retornado"
  ```

### E) Testar Rotas Protegidas
- [ ] **6.6** - Listar colaboradores
  ```bash
  curl -X GET http://localhost:5000/api/collaborators \
    -H "Authorization: Bearer $TOKEN"
  ```
  **Esperado:** Lista de colaboradores (pode estar vazia)

- [ ] **6.7** - Listar listas de compras
  ```bash
  curl -X GET http://localhost:5000/api/lists \
    -H "Authorization: Bearer $TOKEN"
  ```
  **Esperado:** Lista de listas (pode estar vazia)

### F) Testar Criação de Dados
- [ ] **6.8** - Criar um colaborador de teste
  ```bash
  curl -X POST http://localhost:5000/api/collaborators \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Teste Local Railway",
      "email": "teste.railway@local.com",
      "phone": "11999999999",
      "password": "teste123"
    }'
  ```
  **Esperado:** Retornar dados do colaborador criado

- [ ] **6.9** - Verificar no Railway que o colaborador foi criado
  - Acesse o banco via Railway UI ou DBeaver
  - Confirme que "Teste Local Railway" existe na tabela `collaborators`

---

## 🧪 Testes Automatizados

- [ ] **7.1** - Executar suite de testes
  ```bash
  pytest backend/tests/ -v
  ```
  ⚠️ **Atenção:** Testes criarão dados no banco de **PRODUÇÃO**!

- [ ] **7.2** - Executar teste de admin features
  ```bash
  pytest backend/tests/test_admin_features.py -v
  ```

- [ ] **7.3** - Executar script de criação de usuário
  ```bash
  python backend/test_create_user.py
  ```

---

## 🧹 Limpeza (Opcional)

- [ ] **8.1** - Remover dados de teste criados
  ```python
  # No console Python
  from kaizen_app import create_app
  from kaizen_app.extensions import db
  from kaizen_app.models import Collaborator
  
  app = create_app()
  with app.app_context():
      # Deletar colaborador de teste
      test_collab = Collaborator.query.filter_by(
          email="teste.railway@local.com"
      ).first()
      if test_collab:
          db.session.delete(test_collab)
          db.session.commit()
          print("✅ Colaborador de teste removido")
  ```

---

## 📊 Métricas de Sucesso

✅ **Tudo funcionou se:**

1. Backend iniciou com mensagem "Usando PostgreSQL"
2. Health checks retornaram `ok` e `connected`
3. Login retornou token válido
4. Rotas protegidas funcionaram com o token
5. Criação de colaborador funcionou
6. Dados aparecem no banco Railway
7. Testes automatizados passaram (se executados)

---

## ⚠️ Problemas Comuns

### ❌ "connection refused"
**Solução:**
- Verifique se a `DATABASE_URL` está correta
- Confirme que o serviço Postgres está ativo no Railway
- Teste com `psql` ou DBeaver

### ❌ "relation does not exist"
**Solução:**
- Execute `flask db upgrade`
- Verifique se migrações estão aplicadas no Railway

### ❌ "SSL connection error"
**Solução:**
- Já está configurado no `config.py` (`sslmode=prefer`)
- Reinstale: `pip install --upgrade psycopg2-binary`

### ❌ Performance muito lenta
**Solução:**
- Normal - banco está na nuvem
- Para dev offline, volte para SQLite (remova `DATABASE_URL` do `.env`)

---

## 🔄 Reverter para SQLite

Se quiser voltar a usar banco local:

```bash
# Opção 1: Renomear o .env
mv backend/.env backend/.env.railway.backup

# Opção 2: Comentar DATABASE_URL no .env
# Edite backend/.env e comente a linha:
# # DATABASE_URL=postgresql://...

# O config.py fará fallback automático para SQLite
python run.py
```

---

## 📚 Documentação Relacionada

- `backend/CONECTAR_BANCO_RAILWAY.md` - Guia completo detalhado
- `backend/COMO_OBTER_URL_RAILWAY.md` - Como obter credenciais
- `Docs/Railway/RAILWAY_VARIAVEIS_PRONTAS.md` - Variáveis de produção
- `Docs/Railway/RAILWAY_TROUBLESHOOTING_LOGS.md` - Resolução de problemas

---

## 🎯 Próximos Passos

Após validar a conexão:

- [ ] Testar funcionalidades específicas da aplicação
- [ ] Validar fluxo completo de criação de lista
- [ ] Testar atualização de status de itens
- [ ] Verificar relatórios e estatísticas
- [ ] Fazer merge na branch `develop` quando tudo estiver validado

---

**✅ Checklist completo!**  
**Conexão local ↔ Railway PostgreSQL estabelecida com sucesso!**

---

**Última atualização:** 24/12/2025 05:16 BRT
