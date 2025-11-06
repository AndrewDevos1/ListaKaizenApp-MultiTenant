# Guia de Implementação - User Management (Delete, Deactivate, Reactivate)

## Resumo Geral
Implementação de 3 funcionalidades para gerenciamento de usuários:
1. **Delete User** - Deletar usuário completamente do banco (cascade delete)
2. **Deactivate User** - Desativar usuário (soft delete - mantém histórico)
3. **Reactivate User** - Reativar usuário desativado

---

## 1. MODELS.PY - Campo novo na tabela Usuario

### Adicionar o campo `ativo`:
```python
ativo = db.Column(db.Boolean, default=True, nullable=False)
```

**Localização**: No modelo `Usuario`, após o campo `aprovado`

### Atualizar método `to_dict()`:
Adicionar na serialização do usuário:
```python
'ativo': self.ativo,
```

---

## 2. SERVICES.PY - Três novas funções

### Função 1: `delete_user(user_id)`
```python
def delete_user(user_id):
    """Deleta um usuário e todos os registros relacionados."""
    user = Usuario.query.get(user_id)
    if not user:
        return {"error": "Usuário não encontrado."}, 404
    user.listas_atribuidas = []  # Remove relacionamentos many-to-many
    db.session.delete(user)
    db.session.commit()
    return {"message": f"Usuário {user.nome} deletado com sucesso."}, 200
```

### Função 2: `deactivate_user(user_id)`
```python
def deactivate_user(user_id):
    """Desativa um usuário (não conseguirá fazer login)."""
    user = Usuario.query.get(user_id)
    if not user:
        return {"error": "Usuário não encontrado."}, 404
    user.ativo = False
    db.session.commit()
    return {"message": f"Usuário {user.nome} desativado com sucesso."}, 200
```

### Função 3: `reactivate_user(user_id)`
```python
def reactivate_user(user_id):
    """Reativa um usuário desativado."""
    user = Usuario.query.get(user_id)
    if not user:
        return {"error": "Usuário não encontrado."}, 404
    user.ativo = True
    db.session.commit()
    return {"message": f"Usuário {user.nome} reativado com sucesso."}, 200
```

### Modificar função `authenticate_user()`:
Após verificar a senha, adicionar validação:
```python
if not user.ativo:
    return {"error": "Usuário desativado. Entre em contato com o administrador."}, 403
```

---

## 3. CONTROLLERS.PY - Três novos endpoints

### Endpoint 1: DELETE /api/admin/users/<user_id>
```python
@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required()
def delete_user(user_id):
    """Deleta um usuário e todos os registros relacionados."""
    response, status_code = services.delete_user(user_id)
    return jsonify(response), status_code
```

### Endpoint 2: POST /api/admin/users/<user_id>/deactivate
```python
@admin_bp.route('/users/<int:user_id>/deactivate', methods=['POST'])
@admin_required()
def deactivate_user(user_id):
    """Desativa um usuário (não conseguirá fazer login)."""
    response, status_code = services.deactivate_user(user_id)
    return jsonify(response), status_code
```

### Endpoint 3: POST /api/admin/users/<user_id>/reactivate
```python
@admin_bp.route('/users/<int:user_id>/reactivate', methods=['POST'])
@admin_required()
def reactivate_user(user_id):
    """Reativa um usuário desativado."""
    response, status_code = services.reactivate_user(user_id)
    return jsonify(response), status_code
```

---

## 4. MIGRATIONS - Adicionar coluna ao banco

### Executar na pasta `backend/`:
```bash
flask db migrate -m "Add ativo field to Usuario model"
flask db upgrade
```

A migração deve:
- Adicionar coluna `ativo` do tipo BOOLEAN
- Definir valor padrão como `True`
- Fazer NOT NULL

---

## 5. FRONTEND - Chamadas aos endpoints (React/TypeScript)

### Deletar usuário:
```typescript
const response = await fetch(`/api/admin/users/${userId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### Desativar usuário:
```typescript
const response = await fetch(`/api/admin/users/${userId}/deactivate`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### Reativar usuário:
```typescript
const response = await fetch(`/api/admin/users/${userId}/reactivate`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

---

## 6. PONTOS CRÍTICOS - Evitar Problemas

### **NÃO FAZER:**
- ❌ Usar emojis em `print()` statements
- ❌ Usar emojis em comentários de código que será impresso
- ❌ Usar emojis em mensagens de erro
- ❌ Try-except desnecessários nos decorators

### **FAZER:**
- ✅ Usar SEMPRE UTF-8 encoding explícito
- ✅ Testar cada endpoint individualmente
- ✅ Verificar migrações com `flask db current`
- ✅ Limpar cache Python: `find . -type d -name "__pycache__" -exec rm -rf {} +`
- ✅ Verificar que decorator `@admin_required()` está limpo

---

## 7. Ordem de Implementação Recomendada

1. **Modificar models.py** - Adicionar campo `ativo`
2. **Criar migration** - Executar `flask db migrate` e `flask db upgrade`
3. **Adicionar functions em services.py** - Implementar 3 funções novas + modificar authenticate_user()
4. **Adicionar endpoints em controllers.py** - Implementar 3 rotas novas
5. **Testar via Python test_client** - Garantir que funciona
6. **Implementar no Frontend** - Adicionar botões e chamadas axios
7. **Fazer commit** - `git add . && git commit -m "feat: Implement user delete/deactivate/reactivate"`

---

## 8. Teste Rápido com Python

```python
# No python shell com o app context
from kaizen_app import create_app, db
from kaizen_app.models import Usuario

app = create_app('development')
with app.app_context():
    # Testar delete
    usuario = Usuario.query.get(1)
    db.session.delete(usuario)
    db.session.commit()

    # Testar deactivate
    usuario = Usuario.query.get(2)
    usuario.ativo = False
    db.session.commit()
```

---

## Status: PRONTO PARA IMPLEMENTAÇÃO ✅

**Data de documentação**: 2025-10-26
**Versão base**: Commit 9b187b9 (Revert "Add DELETE endpoint for user management")
**Branch**: feature/gerenciar-usuarios

---
