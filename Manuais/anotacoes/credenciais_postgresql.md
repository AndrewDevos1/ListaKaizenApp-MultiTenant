# Credenciais e Guia de Retomada - PostgreSQL

**Data:** 26/10/2025
**Status:** Configuração quase completa - falta apenas criar usuário admin no banco

---

## 🔐 CREDENCIAIS DO POSTGRESQL (RENDER)

### Conexão PostgreSQL:
```
Nome do Banco: kaizen-lists-db-v2
Host: dpg-d3vd9f3ipnbc739ilmcg-a.oregon-postgres.render.com
Porta: 5432
Database: kaizen_db_bhao
Username: kaizen_db_bhao_user
Password: LW2RneI4eTsQhA8ZgJwMj2B7SuCSm4XI
```

### Connection String Completa:
```
postgresql://kaizen_db_bhao_user:LW2RneI4eTsQhA8ZgJwMj2B7SuCSm4XI@dpg-d3vd9f3ipnbc739ilmcg-a/kaizen_db_bhao
```

---

## 👤 CREDENCIAIS DO USUÁRIO ADMIN (APLICAÇÃO)

```
Email: andrew.andyoo@gmail.com
Senha: 210891
```

**IMPORTANTE:** Usuário ainda NÃO foi criado no banco. Precisa executar o SQL abaixo.

---

## 📋 PRÓXIMOS PASSOS (QUANDO RETOMAR)

### Passo 1: Abrir PgAdmin 4
1. Abra o PgAdmin 4
2. Conecte no servidor **"Render Kaizen"** (já está salvo)
3. Se pedir senha: `LW2RneI4eTsQhA8ZgJwMj2B7SuCSm4XI`

### Passo 2: Executar SQL para Criar Admin
1. Clique com botão direito em **"kaizen_db_bhao"**
2. Selecione **"Query Tool"**
3. Cole o SQL abaixo
4. Clique em **"Execute"** (F5)

### Passo 3: Testar Login
1. Acesse: https://lista-kaizen-app.vercel.app
2. Faça login com:
   - Email: `andrew.andyoo@gmail.com`
   - Senha: `210891`

### Passo 4: Testar Persistência
1. Crie alguns dados (área, fornecedor, item)
2. Faça um commit qualquer e push
3. Aguarde deploy no Render
4. Verifique se dados persistiram

---

## 🗄️ SQL PARA CRIAR USUÁRIO ADMIN

```sql
-- Deletar usuário existente (se houver)
DELETE FROM usuarios WHERE email = 'andrew.andyoo@gmail.com';

-- Inserir usuário admin com senha 210891
INSERT INTO usuarios (nome, username, email, senha_hash, role, aprovado, ativo, criado_em)
VALUES (
    'Admin Andrew',
    'admin',
    'andrew.andyoo@gmail.com',
    'scrypt:32768:8:1$p3zKmOxMGVsM2IYE$320ff85214061e3df63b07bb92bcbcacfc7b00957786995ef65429abec6b01e9ba5d21a357cfc5e34bb15497b4a3f777b8b251c0d6087992e4e101dfd1fe8462',
    'ADMIN',
    TRUE,
    TRUE,
    NOW()
);
```

---

## ✅ O QUE JÁ ESTÁ CONFIGURADO

- [x] Banco PostgreSQL criado no Render
- [x] Variáveis de ambiente configuradas no backend
- [x] Build command com migrations automáticas
- [x] Deploy funcionando
- [x] Backend rodando em: https://kaizen-lists-api.onrender.com
- [x] Frontend rodando em: https://lista-kaizen-app.vercel.app

---

## ⏳ O QUE FALTA

- [ ] Inserir usuário admin no PostgreSQL (SQL acima)
- [ ] Testar login na aplicação
- [ ] Verificar persistência de dados após deploy
- [ ] Ajustar config.py com fix postgres:// (opcional)
- [ ] Documentar solução final no README/issues.md

---

## 🔧 COMANDOS ÚTEIS

### Gerar Nova Senha Hash (PowerShell):
```powershell
python -c "from werkzeug.security import generate_password_hash; print(generate_password_hash('SUA_SENHA_AQUI'))"
```

### Conectar no PostgreSQL via PowerShell:
```powershell
$env:DATABASE_URL="postgresql://kaizen_db_bhao_user:LW2RneI4eTsQhA8ZgJwMj2B7SuCSm4XI@dpg-d3vd9f3ipnbc739ilmcg-a/kaizen_db_bhao"
$env:FLASK_CONFIG="production"
python backend/create_admin_user.py
```

### Verificar Usuários no Banco (PgAdmin):
```sql
SELECT id, nome, email, role, aprovado, ativo FROM usuarios;
```

---

## 📝 NOTAS IMPORTANTES

1. **Plano Free do Render:** Banco expira em 25/11/2025 se não fizer upgrade
2. **Migrations:** Rodam automaticamente no build a cada deploy
3. **Desenvolvimento Local:** Continua usando SQLite (`kaizen_dev.db`)
4. **Produção:** Usa PostgreSQL (dados persistem entre deploys)

---

## 🆘 SE TIVER PROBLEMAS

### Erro de CORS:
- Verificar se domínio Vercel está em `backend/kaizen_app/__init__.py`
- Linha ~22: origins permitidas

### Tabelas Duplicadas:
- Limpar banco via PgAdmin antes de rodar migrations
- SQL para limpar:
```sql
DROP TABLE IF EXISTS cotacao_itens CASCADE;
DROP TABLE IF EXISTS cotacoes CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS estoques CASCADE;
DROP TABLE IF EXISTS lista_colaborador CASCADE;
DROP TABLE IF EXISTS listas CASCADE;
DROP TABLE IF EXISTS itens CASCADE;
DROP TABLE IF EXISTS fornecedores CASCADE;
DROP TABLE IF EXISTS areas CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS alembic_version CASCADE;
DROP TYPE IF EXISTS userroles CASCADE;
DROP TYPE IF EXISTS pedidostatus CASCADE;
DROP TYPE IF EXISTS cotacaostatus CASCADE;
```

---

## 🎯 OBJETIVO FINAL

**Desenvolvimento:**
- SQLite local (rápido, sem setup)
- Comando: `flask run --host=0.0.0.0`

**Produção:**
- PostgreSQL (persistente, escalável)
- Deploy automático no Render
- Migrations automáticas

**Resultado:**
- Dados nunca mais zerados após deploy! ✅
- Desenvolvimento continua simples e rápido
- Produção profissional e confiável

---

**Última atualização:** 26/10/2025 às 22:00
