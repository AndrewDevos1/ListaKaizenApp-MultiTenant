# 🚨 TROUBLESHOOTING RENDER - PROBLEMAS COMUNS

## ⚠️⚠️⚠️ ERRO: "no such table: usuarios" (SQLite em produção) ⚠️⚠️⚠️

### SINTOMAS:
- Login falha com erro 502
- Logs mostram: `(sqlite3.OperationalError) no such table: usuarios`
- CORS Missing Allow Origin
- Frontend não consegue fazer login

### CAUSA RAIZ:
**O START COMMAND NO RENDER ESTÁ ERRADO!**

O comando está chamando `create_app()` diretamente sem passar a configuração, então o Flask usa 'development' (SQLite) em vez de 'production' (PostgreSQL).

---

## ✅ SOLUÇÃO DEFINITIVA

### 1. Verificar Start Command no Render

**Dashboard Render → kaizen-lists-api → Settings → Start Command**

❌ **ERRADO:**
```
gunicorn -w 4 -b 0.0.0.0:8080 "kaizen_app:create_app()"
```

✅ **CORRETO:**
```
gunicorn -w 4 -b 0.0.0.0:$PORT run:app
```

### POR QUÊ ISSO FUNCIONA?

**Comando errado:**
- Chama `create_app()` sem argumentos
- Usa config padrão = 'development'
- Tenta usar SQLite
- SQLite não existe no Render
- Erro: "no such table"

**Comando correto:**
- Usa `run.py`
- `run.py` lê `FLASK_CONFIG=production` do ambiente
- Passa `production` para `create_app(config_name)`
- Usa PostgreSQL ✅

---

## 📋 CHECKLIST COMPLETO

Quando der erro de login/502 no Render, verificar NESTA ORDEM:

### 1. ✅ Environment Variables (Render Dashboard → Environment)
Devem existir:
```
FLASK_CONFIG=production
DATABASE_URL=postgresql://... (preenchido automaticamente pelo Render)
```

### 2. ✅ Start Command (Render Dashboard → Settings)
Deve ser:
```
gunicorn -w 4 -b 0.0.0.0:$PORT run:app
```

### 3. ✅ Build Command (Render Dashboard → Settings)
Deve ser:
```
pip install -r requirements.txt
```

### 4. ✅ Pre-Deploy Command (Render Dashboard → Settings)
Pode estar vazio OU:
```
flask db upgrade
```

### 5. ✅ Root Directory
Deve ser:
```
backend
```

---

## 🔍 COMO DIAGNOSTICAR

### Ver logs do Render:
1. Dashboard Render → kaizen-lists-api → Logs
2. Procurar por:
   - `sqlite3.OperationalError` → Start Command errado!
   - `[FLASK] Novo request` → Backend está recebendo requests
   - Código 502 → Backend crashando

### Testar localmente:
```bash
# Simular produção localmente
cd backend
export FLASK_CONFIG=production
export DATABASE_URL=postgresql://...
gunicorn -w 4 -b 0.0.0.0:8080 run:app
```

---

## 📝 HISTÓRICO

**Data:** 22/11/2025
**Problema:** Backend em produção usando SQLite em vez de PostgreSQL
**Causa:** Start Command chamando `create_app()` sem argumentos
**Solução:** Mudar para `run:app` que lê FLASK_CONFIG do ambiente

---

## ⚡ AÇÃO RÁPIDA

Se estiver com erro de login agora:

1. Abra https://dashboard.render.com/
2. Selecione **kaizen-lists-api**
3. Vá em **Settings**
4. Role até **Start Command**
5. Clique em **Edit**
6. Cole: `gunicorn -w 4 -b 0.0.0.0:$PORT run:app`
7. Salve
8. Aguarde 2-3 min o redeploy
9. Teste o login

**NÃO PRECISA FAZER PUSH NO GIT!** É só configuração do Render.
