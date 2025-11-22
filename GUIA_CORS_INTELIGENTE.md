# 🌐 Guia: CORS Inteligente (Dev + Produção)

## 🎯 Problema Resolvido

Antes: CORS configurado com `*` (wildcard) funcionava em DEV mas causaria problemas em PROD.

Agora: **Sistema inteligente que se adapta ao ambiente automaticamente!**

---

## 🔧 Como Funciona

### Desenvolvimento (Local)
```python
CORS_ORIGINS = ['*']  # Aceita QUALQUER origem
```
- ✅ Funciona com `localhost:3000`
- ✅ Funciona com `192.168.x.x:3000`
- ✅ Funciona mudando de rede
- ✅ Funciona com IP do celular

### Produção (Vercel/Deploy)
```python
CORS_ORIGINS = ['https://lista-kaizen-app.vercel.app']  # Apenas seu domínio
```
- ✅ Seguro (só seu domínio)
- ✅ Bloqueado para outros sites
- ✅ Protege contra ataques CSRF

---

## 📁 Arquivos Modificados

### 1. `config.py`
```python
class DevelopmentConfig(Config):
    CORS_ORIGINS = ['*']  # Qualquer origem em DEV
    
class ProductionConfig(Config):
    # Lê do .env ou usa domínio Vercel padrão
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 
        'https://lista-kaizen-app.vercel.app').split(',')
```

### 2. `__init__.py`
```python
def create_app(config_name='production'):
    config = config_by_name[config_name]
    cors_origins = config.CORS_ORIGINS
    
    print(f"[CORS] Ambiente: {config_name}")
    print(f"[CORS] Origens: {cors_origins}")
    
    cors.init_app(app, resources={
        r"/api/*": {
            "origins": cors_origins,  # Usa origens do config
            # ...
        }
    })
```

### 3. `extensions.py`
```python
# Configuração básica (será sobrescrita no create_app)
cors = CORS(resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        # ...
    }
})
```

---

## 🚀 Como Usar

### Desenvolvimento Local

1. **Não precisa fazer nada!**
   - O ambiente já detecta automaticamente
   - CORS aberto para qualquer origem

2. **Opcional: Criar arquivo `.env`**
   ```bash
   cp backend/.env.example backend/.env
   ```

### Deploy (Vercel)

1. **Configure variáveis no Vercel Dashboard:**
   ```
   FLASK_CONFIG=production
   CORS_ORIGINS=https://lista-kaizen-app.vercel.app
   ```

2. **Para múltiplos domínios:**
   ```
   CORS_ORIGINS=https://dominio1.com,https://dominio2.com
   ```

---

## ✅ Testes

### Testar Local:
```bash
cd backend
flask run

# Deve aparecer:
# [CORS] Ambiente: development
# [CORS] Origens permitidas: ['*']
```

### Testar Produção:
```bash
export FLASK_CONFIG=production
export CORS_ORIGINS=https://lista-kaizen-app.vercel.app
flask run

# Deve aparecer:
# [CORS] Ambiente: production
# [CORS] Origens permitidas: ['https://lista-kaizen-app.vercel.app']
```

---

## 🔒 Segurança

### ✅ Development
- Permite qualquer origem (`*`)
- Facilita desenvolvimento
- Aceita localhost, IPs locais, etc

### ✅ Production
- Apenas domínios específicos
- Proteção contra CSRF
- Configurável via variável de ambiente

---

## 📊 Comparação

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Dev | `*` hardcoded | `*` via config |
| Prod | Domínio hardcoded | Domínio via .env |
| Flexibilidade | Baixa | Alta |
| Segurança | Média | Alta |
| Merge Safety | ❌ | ✅ |

---

## 🔄 Fluxo no Git

```bash
# Development Branch
CORS_ORIGINS = ['*']  # Local

# Production Branch (merge)
CORS_ORIGINS = os.environ.get('CORS_ORIGINS')  # Do Vercel
```

**Não há conflito!** O código é o mesmo, apenas a variável de ambiente muda.

---

## 🎯 Configuração Recomendada no Vercel

### Variáveis de Ambiente:
```
FLASK_ENV=production
FLASK_CONFIG=production
CORS_ORIGINS=https://lista-kaizen-app.vercel.app
SECRET_KEY=sua-senha-forte-aqui
JWT_SECRET_KEY=sua-jwt-senha-aqui
DATABASE_URL=sua-database-url-aqui
```

---

## 🐛 Troubleshooting

### Erro: CORS ainda bloqueando

**Causa:** Variável `FLASK_CONFIG` não está definida

**Solução:**
```bash
# Windows
set FLASK_CONFIG=development

# Linux/Mac
export FLASK_CONFIG=development
```

### Erro: Origens não mudando

**Causa:** Cache Python

**Solução:**
```bash
.\limpar_cache.bat
```

---

## 📝 Resumo

✅ **Dev:** CORS aberto (`*`)
✅ **Prod:** CORS restrito (via .env)
✅ **Seguro:** Código preparado para ambos
✅ **Flexível:** Fácil adicionar novos domínios
✅ **Merge-Safe:** Não causa conflitos no git

---

**Status:** ✅ IMPLEMENTADO
**Data:** 2025-10-30
**Merge-Safe:** Sim, 100% seguro para produção
