# Correção: Admin não consegue editar quantidades das listas submetidas

## Problema Identificado

O admin não conseguia editar as quantidades das listas submetidas em produção devido a dois problemas:

### 1. Erros Frontend (CORRIGIDOS)
- Interface Submissao incompleta (campo `criado_em`)
- Estado `setShowModal` não existia
- Botão sem ID referenciado no código

### 2. **Erro 502 Bad Gateway (NOVO - CORRIGIDO)**
**Problema:** Backend crashava ao processar requisição PUT sem tratamento de exceções adequado.

**Sintomas:**
```
CORS Missing Allow Origin
Status: 502 Bad Gateway
Network Error
```

**Causa Raiz:** 
- Função `editar_quantidades_submissao` no backend não tinha try/catch
- Rota do controller não validava dados de entrada
- Qualquer erro causava crash do processo, resultando em 502

## Correções Realizadas

### 1. Frontend - DetalhesSubmissao.tsx (JÁ APLICADO)

#### Erro 1: Interface Submissao incompleta
```typescript
interface Submissao {
    data_submissao: string;
    criado_em?: string;  // Campo adicionado
    // ...
}
```

#### Erro 2: Estado setShowModal corrigido
```typescript
// ANTES: setShowModal(true);
// DEPOIS: 
setShowSuccessModal(true);
setTimeout(() => setShowSuccessModal(false), 2000);
```

#### Erro 3: Botão com ID
```typescript
<Button id="btn-salvar" variant="success" ...>
```

### 2. **Backend - controllers.py (NOVO)**

#### Tratamento robusto na rota PUT
```python
@admin_bp.route('/submissoes/<int:submissao_id>/editar', methods=['PUT'])
@admin_required()
def editar_quantidades_submissao_route(submissao_id):
    try:
        print(f"[editar_quantidades_submissao_route] Recebendo requisição para submissão #{submissao_id}")
        data = request.get_json()
        
        if not data:
            print(f"[editar_quantidades_submissao_route] ERRO: Nenhum dado JSON recebido")
            return jsonify({"error": "Nenhum dado recebido"}), 400
        
        items_data = data.get('items', [])
        print(f"[editar_quantidades_submissao_route] Items recebidos: {len(items_data)}")
        
        response, status = services.editar_quantidades_submissao(submissao_id, items_data)
        print(f"[editar_quantidades_submissao_route] Resposta: {status}")
        return jsonify(response), status
    except Exception as e:
        print(f"[editar_quantidades_submissao_route] EXCEÇÃO: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Erro interno ao processar edição", "details": str(e)}), 500
```

### 3. **Backend - services.py (NOVO)**

#### Try/catch e rollback em caso de erro
```python
def editar_quantidades_submissao(submissao_id, pedidos_data):
    try:
        # ... todo o código de processamento ...
        db.session.commit()
        print(f"[editar_quantidades_submissao] Edição concluída com sucesso")
        return {...}, 200
        
    except Exception as e:
        print(f"[editar_quantidades_submissao] EXCEÇÃO: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        db.session.rollback()  # CRÍTICO: Reverte transação
        return {"error": f"Erro ao editar submissão: {str(e)}"}, 500
```

## Como Testar

### 1. Verificar Logs do Railway
Após deploy, os logs devem mostrar:
```
[editar_quantidades_submissao_route] Recebendo requisição para submissão #X
[editar_quantidades_submissao] Iniciando edição da submissão #X
[editar_quantidades_submissao] Dados recebidos: N itens
[editar_quantidades_submissao] Status da submissão: PENDENTE
[editar_quantidades_submissao] Lista tem N itens
[editar_quantidades_submissao] N itens atualizados
[editar_quantidades_submissao] N pedidos criados
[editar_quantidades_submissao] Edição concluída com sucesso
[editar_quantidades_submissao_route] Resposta: 200
```

### 2. Verificar no Console do Navegador (F12)
```
[DetalhesSubmissao] Enviando edição: { submissao_id: 7, items: [...] }
[DetalhesSubmissao] Resposta recebida: { message: "...", pedidos_criados: N }
```

### 3. Testar Funcionalidade Completa
1. **Login como Admin**
2. **Navegar para** `https://kaizen-compras.up.railway.app/admin/submissoes/7`
3. **Clicar em "Editar Quantidades"**
4. **Alterar valores e clicar em "Salvar"**
5. **Verificar:**
   - ✅ Sem erro 502
   - ✅ Modal de sucesso aparece
   - ✅ Dados são atualizados
   - ✅ Console do navegador sem erros CORS

## Deploy em Produção

### 1. Commit das Correções
```bash
git add backend/kaizen_app/controllers.py backend/kaizen_app/services.py
git commit -m "fix: adiciona tratamento de exceções robusto na edição de submissões

- Adiciona try/catch na rota de edição
- Adiciona rollback em caso de erro no banco
- Adiciona validação de dados de entrada
- Adiciona logs detalhados para debugging"
```

### 2. Push para Produção (Master)
```bash
git push origin master
```

### 3. Aguardar Deploy Railway
- Railway detecta push automático
- Deploy inicia (~2-3 minutos)
- Backend reinicia com novo código

### 4. Limpar Cache e Testar
```bash
# No navegador:
Ctrl + Shift + Delete -> Limpar cache
F5 (Hard Refresh)
```

## Possíveis Erros e Soluções

### Erro: "Nenhum dado recebido" (400)
**Solução:** Frontend não está enviando JSON. Verificar `api.put()`.

### Erro: "Erro ao editar submissão: ..." (500)
**Solução:** Verificar logs do Railway para detalhes da exceção.

### Erro: Ainda recebe 502
**Solução:** 
1. Verificar se deploy completou no Railway
2. Verificar memória/CPU no Railway (pode estar sobrecarregado)
3. Verificar timeout do Railway (aumentar se necessário)

### Erro: CORS ainda bloqueando
**Solução:** 
- CORS está configurado em `__init__.py`
- Verificar variável `CORS_ORIGINS` no Railway
- Deve ser: `https://kaizen-compras.up.railway.app`

## Arquivos Modificados

- `frontend/src/features/admin/DetalhesSubmissao.tsx` ✅ (commit anterior)
- `backend/kaizen_app/services.py` ✅ (este commit)
- `backend/kaizen_app/controllers.py` ✅ (este commit)
- `CORRECAO_EDICAO_ADMIN.md` (atualizado)

## Status

✅ Correções frontend aplicadas (commit anterior)
✅ Correções backend aplicadas (este commit)
⏳ Aguardando commit e deploy em produção

## Resumo Técnico

**Problema:** Erro 502 ao fazer PUT `/api/admin/submissoes/{id}/editar`

**Causa:** Backend crashava sem tratamento de exceções

**Solução:** 
1. Try/catch na rota do controller
2. Try/catch com rollback no service
3. Validação de dados de entrada
4. Logs detalhados para debugging

**Resultado Esperado:** 
- ✅ Sem erro 502
- ✅ Erros retornam 500 com mensagem clara
- ✅ Rollback automático em caso de falha
- ✅ Logs completos no Railway para debugging
