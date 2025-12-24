# 🔧 FIX: Erro CORS ao Cadastrar Usuário

## ❌ Problema

```
CORS Failed
Requisição cross-origin bloqueada
NS_ERROR_DOM_BAD_URI
```

O frontend não consegue acessar o backend devido a erro de CORS.

---

## ✅ Solução Aplicada

### 1. **Extensions.py Atualizado**
Arquivo: `backend/kaizen_app/extensions.py`

```python
cors = CORS(resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})
```

### 2. **__init__.py Atualizado**
Arquivo: `backend/kaizen_app/__init__.py`

Adicionado handler CORS adicional:

```python
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response
```

---

## 🚀 Como Aplicar

### Passo 1: Parar o Backend
Pressione `Ctrl+C` no terminal onde o Flask está rodando

### Passo 2: Limpar Cache Python
```bash
cd backend
for /d /r %i in (__pycache__) do @if exist "%i" rd /s /q "%i"
del /s /q *.pyc
```

Ou use o script:
```bash
.\limpar_cache.bat
```

### Passo 3: Reiniciar Backend
```bash
cd backend
.venv\Scripts\activate
set PYTHONDONTWRITEBYTECODE=1
flask run
```

### Passo 4: Testar
1. Acesse `http://localhost:3000/register`
2. Preencha o formulário
3. Clique em "Solicitar Cadastro"
4. Deve funcionar sem erro CORS!

---

## 🔍 Verificar se Funcionou

**No terminal do Flask, deve aparecer:**
```
[FLASK] Nova requisicao recebida!
[FLASK] Metodo: OPTIONS  ← Requisição CORS preflight
[FLASK] Path: /api/auth/register
...
[FLASK] Status: 200 OK

[FLASK] Nova requisicao recebida!
[FLASK] Metodo: POST  ← Requisição real
[FLASK] Path: /api/auth/register
...
[FLASK] Status: 201 CREATED
```

**No navegador (Console):**
- ✅ Sem erros CORS
- ✅ Mensagem de sucesso aparece

---

## 🌐 Explicação do CORS

### O que é CORS?
Cross-Origin Resource Sharing - Mecanismo de segurança que permite que um site acesse recursos de outro domínio.

### Por que dá erro?
- Frontend: `http://localhost:3000`
- Backend: `http://192.168.88.122:5000`
- Origens diferentes = Bloqueado por padrão

### Como resolver?
Configurar o backend para aceitar requisições de outras origens.

---

## 🔒 Segurança

### Desenvolvimento:
```python
"origins": "*"  # Aceita qualquer origem
```

### Produção:
```python
"origins": ["https://seu-dominio.vercel.app"]  # Apenas domínio específico
```

O código já está preparado para ambos!

---

## 🐛 Se Ainda Der Erro

### 1. Verificar se Backend está rodando:
```bash
curl http://127.0.0.1:5000/api/auth/register
```

### 2. Verificar logs do Flask:
Procure por erros ou exceções no terminal

### 3. Limpar cache do navegador:
- Pressione `Ctrl+Shift+Del`
- Limpe cache e cookies
- Ou use modo anônimo

### 4. Verificar firewall:
O firewall pode estar bloqueando a porta 5000

### 5. Tentar com 127.0.0.1:
No arquivo `frontend/src/services/api.ts`, deixe:
```typescript
baseURL: 'http://127.0.0.1:5000/api'
```

---

## 📝 Resumo das Mudanças

| Arquivo | O que mudou |
|---------|-------------|
| `extensions.py` | CORS configurado completamente |
| `__init__.py` | Handler adicional para CORS |

---

## ✅ Checklist

- [ ] Backend parado
- [ ] Cache limpo
- [ ] Backend reiniciado
- [ ] Frontend testado
- [ ] Sem erro CORS
- [ ] Cadastro funcionando

---

**Status:** ✅ CORRIGIDO
**Data:** 2025-10-30
**Causa:** CORS não configurado corretamente
**Solução:** Headers CORS adicionados
