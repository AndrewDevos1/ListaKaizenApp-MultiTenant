# 📱 Navbar Personalizável - Documentação Completa

**Data de Implementação**: 26/12/2024 - 04:14 BRT  
**Branch**: `atualizando-navbar`  
**Versão**: 1.0.0

---

## 🎯 Objetivo

Implementar sistema de navegação personalizável onde cada usuário pode expandir/colapsar categorias do menu, com o estado salvo no banco de dados de forma persistente entre sessões.

---

## ✅ Funcionalidades Implementadas

### 1️⃣ **Categorias Expansíveis**
- Todas as categorias começam **recolhidas** por padrão
- Usuário clica no título da categoria para expandir/colapsar
- Ícones visuais: `▶` (recolhida) / `▼` (expandida)
- Animação suave de transição

### 2️⃣ **Persistência por Usuário**
- Estado salvo no banco de dados PostgreSQL
- Cada usuário tem suas próprias preferências
- Sincronização automática entre dispositivos
- Estado restaurado ao fazer login

### 3️⃣ **Reorganização do Menu Admin**
- **Áreas** movida de "Listas & Estoque" para "Gestão"
- **Catálogo Global** renomeado para "Itens Cadastrados"
- **Submissões** movida para "Listas & Estoque"
- Links duplicados removidos

---

## 📐 Arquitetura

### **Backend (Flask + PostgreSQL)**

#### Model: `NavbarPreference`
```python
class NavbarPreference(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(db.Integer, ForeignKey, unique=True)
    categorias_estado = db.Column(db.JSON)  # {"GESTÃO": true, "PERFIL": false}
    criado_em = db.Column(db.DateTime)
    atualizado_em = db.Column(db.DateTime)
```

#### Endpoints API
```
GET  /auth/navbar-preferences    # Buscar preferências
POST /auth/navbar-preferences    # Salvar preferências
```

**Payload de Salvamento:**
```json
{
  "categorias_estado": {
    "VISÃO GERAL": false,
    "LISTAS & ESTOQUE": true,
    "GESTÃO": false,
    "PERFIL": false
  }
}
```

**Resposta:**
```json
{
  "id": 1,
  "usuario_id": 123,
  "categorias_estado": {...},
  "criado_em": "2024-12-26T04:00:00",
  "atualizado_em": "2024-12-26T04:15:00"
}
```

---

### **Frontend (React + TypeScript)**

#### Estado Local
```typescript
const [expandedGroups, setExpandedGroups] = useState<{[key: string]: boolean}>({});
const [preferencesLoaded, setPreferencesLoaded] = useState(false);
```

#### Fluxo de Carregamento
1. Usuário faz login
2. `useEffect` carrega preferências via API
3. Estado `expandedGroups` é populado
4. Navbar renderiza com categorias corretas

#### Fluxo de Salvamento
1. Usuário clica em categoria
2. `toggleGroup()` atualiza estado local
3. `saveNavbarPreferences()` envia para API
4. Backend salva no banco de dados

---

## 🗂️ Estrutura do Menu

### **Menu Admin**

```
┌─────────────────────────────┐
│ 🛡️  Andrew Devos            │
│    Administrador            │
├─────────────────────────────┤
│ ▶ VISÃO GERAL              │ ← Recolhida
│                             │
│ ▼ LISTAS & ESTOQUE         │ ← Expandida
│   • Listas de Compras       │
│   • Itens Cadastrados       │
│   • Submissões              │
│                             │
│ ▶ GESTÃO                   │ ← Recolhida
│   (oculto até expandir)     │
│                             │
│ ▶ PERFIL                   │ ← Recolhida
└─────────────────────────────┘
```

**Categorias:**
- **VISÃO GERAL**: Dashboard Admin, Dashboard Global
- **LISTAS & ESTOQUE**: Listas de Compras, Itens Cadastrados, Submissões
- **GESTÃO**: Áreas, Gerenciar Usuários, Fornecedores, Gerar Cotação, Cotações
- **PERFIL**: Editar Perfil, Mudar Senha, Sair

---

### **Menu Colaborador**

```
┌─────────────────────────────┐
│ 👤 Joya                     │
│    Colaborador              │
├─────────────────────────────┤
│ ▼ DASHBOARD                │
│   • Meu Dashboard           │
│                             │
│ ▶ MINHAS ATIVIDADES        │
│                             │
│ ▶ PERFIL                   │
└─────────────────────────────┘
```

**Categorias:**
- **DASHBOARD**: Meu Dashboard
- **MINHAS ATIVIDADES**: Minhas Listas, Minhas Submissões
- **PERFIL**: Editar Perfil, Mudar Senha, Sair

---

## 🎨 Estilos CSS

### Classes Adicionadas
```css
.menuGroupTitle {
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
}

.menuGroupTitle:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.menuGroupItems {
  overflow: hidden;
  transition: max-height 0.3s ease-in-out;
}
```

### Ícones FontAwesome
- **Recolhida**: `fa-chevron-right` (▶)
- **Expandida**: `fa-chevron-down` (▼)

---

## 📊 Banco de Dados

### Tabela: `navbar_preferences`

| Coluna | Tipo | Constraints | Descrição |
|--------|------|-------------|-----------|
| `id` | INTEGER | PRIMARY KEY | ID único |
| `usuario_id` | INTEGER | FK, UNIQUE, NOT NULL | Referência para `usuarios.id` |
| `categorias_estado` | JSON | NOT NULL | Estado das categorias (expandida/recolhida) |
| `criado_em` | DATETIME | DEFAULT NOW | Data de criação |
| `atualizado_em` | DATETIME | ON UPDATE NOW | Última atualização |

**Migration**: `35cb89d7ecce_add_navbar_preferences_table.py`

**Relacionamento**:
```
Usuario 1 <---> 1 NavbarPreference
```

---

## 🔧 Como Usar

### Para o Usuário Final

1. **Expandir Categoria**: Clicar no título da categoria (ex: "GESTÃO")
2. **Colapsar Categoria**: Clicar novamente no título
3. **Estado Salvo**: Automaticamente sincronizado com o servidor
4. **Persistência**: Preferências mantidas entre logins/dispositivos

### Para Desenvolvedores

#### Adicionar Nova Categoria
```typescript
// No Layout.tsx, adicionar ao adminMenuGroups ou collaboratorMenuGroups
{
  title: 'NOVA CATEGORIA',
  items: [
    { path: '/admin/novo', icon: 'fa-star', label: 'Novo Item', ariaLabel: 'Novo Item' }
  ]
}
```

#### Modificar Estado Padrão
```typescript
// Backend: services.py -> get_navbar_preferences()
// Retornar estado customizado quando usuário não tem preferências
return {
  "categorias_estado": {
    "VISÃO GERAL": true,  // Expandida por padrão
    "PERFIL": false        // Recolhida por padrão
  }
}, 200
```

---

## 🧪 Testes

### Teste Manual

1. **Login como Admin**
   - Verificar se todas categorias começam recolhidas
   - Expandir "LISTAS & ESTOQUE"
   - Fazer logout e login novamente
   - Verificar se categoria permanece expandida

2. **Login como Colaborador**
   - Repetir teste acima
   - Verificar que preferências são independentes

3. **Múltiplos Dispositivos**
   - Fazer login no navegador A
   - Expandir categorias
   - Fazer login no navegador B
   - Verificar se estado está sincronizado

### Teste Automatizado (Futuro)
```javascript
describe('Navbar Preferences', () => {
  it('should save expanded state', async () => {
    // Login
    // Expandir categoria
    // Verificar POST /auth/navbar-preferences
    // Recarregar página
    // Verificar GET /auth/navbar-preferences
    // Categoria deve estar expandida
  });
});
```

---

## 🐛 Troubleshooting

### Problema: Categorias não expandem
**Solução**: 
- Verificar console do navegador (F12)
- Confirmar que API está respondendo: `GET /auth/navbar-preferences`
- Verificar token JWT válido

### Problema: Estado não persiste
**Solução**:
- Confirmar que `POST /auth/navbar-preferences` está sendo chamado
- Verificar tabela `navbar_preferences` no banco de dados
- Checar logs do Flask

### Problema: Erro 500 ao salvar
**Solução**:
- Verificar migration aplicada: `flask db upgrade`
- Confirmar estrutura da tabela no PostgreSQL
- Checar logs: `tail -f backend/logs/kaizen.log`

---

## 📈 Melhorias Futuras

### Fase 2 (Opcional)
- [ ] Animações mais suaves (CSS transitions)
- [ ] Arrastar e soltar para reordenar categorias
- [ ] Ocultar categorias completamente
- [ ] Temas personalizados (cores)
- [ ] Atalhos de teclado (Ctrl+número para expandir)

### Fase 3 (Avançado)
- [ ] Favoritos: marcar links mais usados
- [ ] Recentes: últimas páginas visitadas
- [ ] Busca inteligente com histórico
- [ ] Sincronização em tempo real (WebSocket)

---

## 📂 Arquivos Modificados

### Backend
```
backend/kaizen_app/models.py                    (+ NavbarPreference model)
backend/kaizen_app/services.py                  (+ get/save preferences)
backend/kaizen_app/controllers.py               (+ endpoints API)
backend/migrations/versions/35cb89d7ecce_*.py   (+ migration)
```

### Frontend
```
frontend/src/components/Layout.tsx              (+ lógica expand/collapse)
frontend/src/components/Layout.module.css       (+ estilos)
```

### Documentação
```
NAVBAR_PERSONALIZAVEL.md                        (este arquivo)
```

---

## 📝 Changelog

### v1.0.0 - 26/12/2024
- ✅ Model NavbarPreference criado
- ✅ Migration aplicada
- ✅ Endpoints API implementados
- ✅ Frontend com expand/collapse
- ✅ Persistência no banco de dados
- ✅ Áreas movida para Gestão
- ✅ Menu admin reorganizado
- ✅ Documentação completa

---

## 👥 Autores

**Desenvolvedor**: DevOps Assistant  
**Revisão**: Andrew Devos  
**Data**: 26/12/2024

---

## 📞 Suporte

Para problemas ou dúvidas:
1. Verificar este documento
2. Consultar logs do backend
3. Testar endpoints via Postman/Insomnia
4. Reportar issue com detalhes completos

---

**🎉 Sistema de Navbar Personalizável Implementado com Sucesso!**
