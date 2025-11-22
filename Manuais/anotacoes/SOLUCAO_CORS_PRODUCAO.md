# Solução para Erro de CORS em Produção (Render)

## Problema
Erro: **"CORS Missing Allow Origin"** ao fazer requisições do frontend (Vercel) para o backend (Render).

## Solução Aplicada

### 1. Código Backend Atualizado ✅
O código já foi atualizado em `backend/kaizen_app/__init__.py` para ler a variável de ambiente `CORS_ORIGINS`.

### 2. Configurar Variável no Render ⚠️ AÇÃO NECESSÁRIA

**IMPORTANTE:** Você precisa configurar a variável de ambiente `CORS_ORIGINS` no painel do Render.

#### Passos no Render:

1. Acesse o [Dashboard do Render](https://dashboard.render.com/)
2. Selecione o serviço **kaizen-lists-api**
3. Vá em **Environment** (menu lateral esquerdo)
4. Clique em **Add Environment Variable**
5. Adicione:
   - **Key:** `CORS_ORIGINS`
   - **Value:** `https://lista-kaizen-app.vercel.app`

   ⚠️ **IMPORTANTE:** Substitua pelo domínio correto da sua aplicação na Vercel!

   Se tiver múltiplos domínios, separe por vírgula:
   ```
   https://lista-kaizen-app.vercel.app,https://outro-dominio.com
   ```

6. Clique em **Save Changes**
7. O Render irá **automaticamente fazer redeploy** do backend

### 3. Aguardar Deploy
Aguarde cerca de 2-3 minutos para o deploy completar. Você pode acompanhar em "Logs" no Render.

### 4. Testar
Depois do deploy:
1. Limpe o cache do navegador (Ctrl + Shift + Delete)
2. Tente fazer login novamente
3. O erro de CORS deve estar resolvido!

## Como Funciona

### Antes (estava quebrando):
```python
# CORS configurado como "*" (hardcoded)
cors.init_app(app, resources={
    r"/api/*": {
        "origins": ["*"],  # ❌ Não funciona bem no Render
        ...
    }
})
```

### Depois (corrigido):
```python
# CORS lê da variável de ambiente
cors_origins_str = os.environ.get('CORS_ORIGINS', '*')
cors.init_app(app, resources={
    r"/api/*": {
        "origins": allowed_origins,  # ✅ Usa o domínio configurado
        ...
    }
})
```

## Notas Importantes

- ✅ Em **desenvolvimento local**, não precisa configurar `CORS_ORIGINS` (usa `*` por padrão)
- ⚠️ Em **produção (Render)**, SEMPRE configure com os domínios específicos permitidos
- 📝 O código agora imprime no log: `[CORS] Configurando CORS com origens permitidas: ...`
- 🔒 Por segurança, nunca use `*` em produção - sempre especifique os domínios

## Verificar se Funcionou

Após configurar e fazer deploy, verifique nos logs do Render:
```
[CORS] Configurando CORS com origens permitidas: ['https://lista-kaizen-app.vercel.app']
```

Se aparecer isso, está correto!

## Próximos Passos

1. ✅ Código atualizado (já feito)
2. ⏳ Configurar `CORS_ORIGINS` no Render (você precisa fazer)
3. ⏳ Aguardar redeploy
4. ⏳ Testar login

---

**Data da correção:** 22/11/2025
**Arquivo alterado:** `backend/kaizen_app/__init__.py`
