# 🐘 Configuração PostgreSQL Railway - Local e Produção

## ✅ Usar o mesmo banco em Development e Production

### 1️⃣ **Criar arquivo .env no backend/**

```bash
cd backend
```

Crie o arquivo `.env`:
```bash
# PostgreSQL do Railway (mesmo banco usado em produção)
DATABASE_URL=postgresql://postgres:jdmrKwvtVwncIsPChhdOEQLyCSnphyAm@postgres.railway.internal:5432/railway

# OU se estiver fora da rede Railway (conexão externa):
# DATABASE_URL=postgresql://postgres:jdmrKwvtVwncIsPChhdOEQLyCSnphyAm@junction.proxy.rlwy.net:PORTA_EXTERNA/railway

# Configuração do Flask
FLASK_CONFIG=development
FLASK_APP=run.py
SECRET_KEY=sua-chave-local-super-secreta
```

### 2️⃣ **Obter URL de conexão externa do Railway**

No Railway Dashboard:
1. Vá no serviço **Postgres**
2. Aba **"Connect"** 
3. Copie a **"Public URL"** ou **"External URL"**

Exemplo:
```
postgresql://postgres:senha@junction.proxy.rlwy.net:12345/railway
```

### 3️⃣ **Instalar python-dotenv (se não tiver)**

```bash
pip install python-dotenv
```

Adicione no `requirements.txt`:
```
python-dotenv==1.0.0
```

### 4️⃣ **Atualizar run.py para carregar .env**

Em `backend/run.py`, adicione no topo:

```python
from dotenv import load_dotenv
import os

# Carregar variáveis de ambiente do .env
load_dotenv()

# Resto do código...
```

### 5️⃣ **Rodar migrações localmente**

```bash
cd backend

# Ativar venv
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac

# Rodar migrações
flask db upgrade

# Criar usuário admin
python create_admin_user.py
```

### 6️⃣ **Iniciar servidor local**

```bash
flask run --host=0.0.0.0
```

Agora seu **desenvolvimento usa o mesmo banco do Railway**! 🎉

---

## 🔐 **IMPORTANTE: Segurança**

### **.gitignore já ignora .env:**
```
backend/.env
```

✅ **NUNCA commite o .env com credenciais!**

---

## 🌐 **Conexão Interna vs Externa**

### **Interna (dentro do Railway):**
```
postgres.railway.internal:5432
```
✅ Usa rede privada do Railway  
❌ Não funciona no seu computador local

### **Externa (seu computador → Railway):**
```
junction.proxy.rlwy.net:PORTA
```
✅ Funciona de qualquer lugar  
⚠️ Use SSL (já configurado)

---

## 📊 **Vantagens dessa Abordagem**

✅ **Paridade:** Dev = Prod (evita bugs de diferenças SQLite ↔ PostgreSQL)  
✅ **Testes reais:** Validar queries PostgreSQL localmente  
✅ **Time real:** Dados compartilhados com produção (se quiser)  
✅ **Profissional:** Prática comum em empresas

---

## ⚠️ **Cuidados**

1. **Não compartilhe o .env** (já está no .gitignore)
2. **Use banco de teste separado** para testes automatizados
3. **Considere ter 2 bancos no Railway:**
   - Um para **development** (dados de teste)
   - Um para **production** (dados reais)

---

## 🚀 **Próximos Passos**

1. ✅ Commit e push das mudanças no config.py
2. ✅ Criar `.env` local com URL do PostgreSQL
3. ✅ Rodar migrações localmente
4. ✅ Testar aplicação local com PostgreSQL
5. ✅ Atualizar Start Command no Railway (remover fix_render_db_emergency.py)

**Vamos fazer isso agora?** 🔥
