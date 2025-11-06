# 🔧 Fix CORS: Requisição OPTIONS Não Chega ao Flask

## ❌ Problema Atual

```
CORS Failed
Requisição OPTIONS não chega ao Flask
Backend não recebe preflight request
```

### Diagnóstico:
1. ✅ CORS configurado no Flask
2. ✅ Headers corretos
3. ❌ **OPTIONS não chega ao servidor**

---

## ✅ Soluções Aplicadas

### 1. Host Bind Mudado para 0.0.0.0

**Arquivo:** `backend/run.py`

**Antes:**
```python
app.run(host='127.0.0.1', port=5000)  # Só localhost
```

**Depois:**
```python
app.run(host='0.0.0.0', port=5000)  # Todas as interfaces
```

**Por quê?**
- `127.0.0.1` só aceita conexões do próprio PC
- `0.0.0.0` aceita de qualquer IP na rede local
- Frontend em `192.168.88.122:3000` precisa acessar `192.168.88.122:5000`

---

### 2. Handler OPTIONS Explícito

**Arquivo:** `backend/kaizen_app/__init__.py`

```python
@app.route('/api/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    """Handler para requisições OPTIONS (CORS preflight)"""
    response = app.make_default_options_response()
    origin = request.headers.get('Origin')
    
    if config_name == 'development':
        response.headers['Access-Control-Allow-Origin'] = origin or '*'
        
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, PUT, POST, DELETE, OPTIONS'
    response.headers['Access-Control-Max-Age'] = '3600'
    
    return response
```

---

### 3. Script de Reinício Criado

**Arquivo:** `backend/start_backend.bat`

Automatiza:
- ✅ Mata processos Python antigos
- ✅ Limpa cache
- ✅ Configura variáveis de ambiente
- ✅ Inicia Flask com configuração correta

---

## 🚀 Como Aplicar

### Passo 1: Parar Tudo
Feche o terminal do Flask (Ctrl+C)

### Passo 2: Usar Novo Script
```bash
cd backend
.\start_backend.bat
```

**OU manualmente:**

```bash
cd backend
.venv\Scripts\activate

set PYTHONDONTWRITEBYTECODE=1
set FLASK_CONFIG=development
set FLASK_ENV=development

python run.py
```

### Passo 3: Verificar Logs

Deve aparecer:
```
🚀 Flask Server Starting...
================================================
Environment: development
Host: 0.0.0.0 (Aceita de qualquer IP na rede)
Port: 5000
Debug: True
================================================

[CORS] Ambiente: development
[CORS] Origens permitidas: ['*']

 * Running on http://0.0.0.0:5000
 * Running on http://127.0.0.1:5000
 * Running on http://192.168.88.122:5000  ← Seu IP local
```

### Passo 4: Testar Cadastro

1. Frontend: `http://localhost:3000/register`
2. Preencha o formulário
3. Clique em "Solicitar Cadastro"

**Logs esperados no Flask:**
```
[CORS] OPTIONS preflight respondido para: auth/register
[CORS] Origin: http://localhost:3000
[CORS] Status: 200 OK

[FLASK] Nova requisicao recebida!
[FLASK] Metodo: POST
[FLASK] Path: /api/auth/register
```

---

## 🔍 Por Que Não Funcionava?

### Problema 1: Host Binding
```
Frontend: http://192.168.88.122:3000
Backend:  http://127.0.0.1:5000  ❌

Requisição cross-origin bloqueada!
```

### Solução:
```
Frontend: http://192.168.88.122:3000
Backend:  http://0.0.0.0:5000 → 192.168.88.122:5000  ✅

Aceita requisições de qualquer IP na rede!
```

### Problema 2: OPTIONS Não Tratado
Flask-CORS às vezes não captura OPTIONS em rotas dinâmicas.

### Solução:
Handler explícito para `/api/<path:path>` com método OPTIONS.

---

## 🧪 Testes

### Teste 1: Servidor Acessível
```bash
# No navegador, acesse:
http://192.168.88.122:5000/api/auth/login

# Deve retornar erro JSON (normal, sem login)
# Se der "Connection refused" = servidor não acessível
```

### Teste 2: CORS Funcionando
```javascript
// No console do navegador (F12):
fetch('http://192.168.88.122:5000/api/auth/register', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    nome: 'Teste',
    email: 'teste@test.com',
    senha: '123456'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

---

## 🐛 Se Ainda Não Funcionar

### 1. Verificar Firewall
```bash
# Windows Firewall pode estar bloqueando porta 5000
# Adicione exceção:
# Painel de Controle → Firewall → Permitir app
```

### 2. Verificar Antivírus
Alguns antivírus bloqueiam servidores locais na rede.

### 3. Usar Localhost no Frontend
**Arquivo:** `frontend/src/services/api.ts`

```typescript
baseURL: 'http://127.0.0.1:5000/api'  // Em vez de 192.168.x.x
```

### 4. Testar com Curl
```bash
curl -X OPTIONS http://192.168.88.122:5000/api/auth/register \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

Deve retornar headers CORS.

---

## 📝 Checklist

- [ ] Backend parado
- [ ] Cache limpo
- [ ] Script `start_backend.bat` executado
- [ ] Logs mostram "Running on http://0.0.0.0:5000"
- [ ] Logs mostram "Running on http://192.168.88.122:5000"
- [ ] Frontend testado
- [ ] OPTIONS recebido no Flask
- [ ] POST funcionando

---

## 🔒 Segurança

**Desenvolvimento:**
- `0.0.0.0` é seguro em rede local confiável
- Apenas dispositivos na mesma rede podem acessar

**Produção:**
- Vercel cuida do binding automaticamente
- Não precisa configurar host

---

**Status:** ✅ IMPLEMENTADO
**Data:** 2025-10-30
**Próximo Passo:** Executar `start_backend.bat`
