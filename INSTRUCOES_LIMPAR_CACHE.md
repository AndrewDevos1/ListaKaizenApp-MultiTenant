# 🧹 Instruções para Limpar Cache e Resolver Problema de Login

## ⚠️ Problema
Erro ao fazer login devido a tokens JWT antigos ou cache Python desatualizado.

## ✅ Solução em 3 Passos

### Passo 1️⃣: Limpar Cache Python (Backend)

**Opção A - Usar Script Automático (RECOMENDADO):**
```bash
# Execute o arquivo batch na raiz do projeto:
limpar_cache.bat
```

**Opção B - Manual via PowerShell:**
```powershell
# Remover diretórios __pycache__
Get-ChildItem -Path "D:\Codigos VSCode\Kaizen_lista_app\backend" -Filter "__pycache__" -Recurse -Directory | Remove-Item -Recurse -Force

# Remover arquivos .pyc
Get-ChildItem -Path "D:\Codigos VSCode\Kaizen_lista_app\backend" -Filter "*.pyc" -Recurse | Remove-Item -Force

# Remover arquivos .pyo
Get-ChildItem -Path "D:\Codigos VSCode\Kaizen_lista_app\backend" -Filter "*.pyo" -Recurse | Remove-Item -Force
```

**Opção C - Manual via CMD:**
```cmd
cd "D:\Codigos VSCode\Kaizen_lista_app\backend"

# Remover __pycache__
for /d /r %%i in (__pycache__) do @if exist "%%i" rd /s /q "%%i"

# Remover .pyc
del /s /q *.pyc

# Remover .pyo
del /s /q *.pyo
```

---

### Passo 2️⃣: Limpar Tokens do Browser (Frontend)

**Opção A - Usar Ferramenta HTML (RECOMENDADO):**
1. Abra o arquivo `limpar_tokens_browser.html` no navegador
2. Clique em "🗑️ Limpar Tokens"
3. Pronto!

**Opção B - Console do Browser:**
1. Abra o site do Kaizen Lists
2. Pressione F12 (DevTools)
3. Vá na aba "Console"
4. Cole e execute:

```javascript
localStorage.removeItem('accessToken');
localStorage.removeItem('sessionExpiry');
localStorage.removeItem('rememberedEmail');
localStorage.removeItem('configSessionTimeout');
console.clear();
console.log('✅ Tokens limpos! Faça login novamente.');
```

**Opção C - Limpar TUDO (localStorage completo):**
```javascript
localStorage.clear();
console.log('✅ localStorage limpo completamente!');
```

---

### Passo 3️⃣: Reiniciar Backend e Frontend

**Backend:**
```bash
cd backend
.venv\Scripts\activate
set PYTHONDONTWRITEBYTECODE=1
flask run
```

**Frontend (em outro terminal):**
```bash
cd frontend
npm start
```

---

## 🎯 Checklist de Verificação

Após executar os 3 passos, verifique:

- [ ] Cache Python foi removido (sem __pycache__ nas pastas)
- [ ] Tokens foram limpos do browser (vazio no localStorage)
- [ ] Backend iniciado SEM erros
- [ ] Frontend iniciado SEM erros
- [ ] Consegue acessar a tela de login
- [ ] **Consegue fazer login com sucesso ✅**

---

## 🔍 Verificar se Cache Foi Limpo

### Backend (Python):
```bash
# Procurar por __pycache__ (não deve encontrar nada)
cd backend
dir /s /b __pycache__
```

Resultado esperado: **"Arquivo não encontrado"**

### Frontend (Browser):
```javascript
// No console do browser
console.log('Itens no localStorage:', localStorage.length);
console.log('Token existe?', localStorage.getItem('accessToken'));
```

Resultado esperado: 
- `localStorage.length` deve ser 0 ou muito pequeno
- `accessToken` deve ser `null`

---

## 🐛 Troubleshooting

### Problema: "Cache ainda existe após limpar"
**Solução:**
1. Feche TODOS os terminais/processos Python
2. Reinicie o VS Code
3. Execute a limpeza novamente

### Problema: "Token ainda existe no browser"
**Solução:**
1. Use navegador em modo anônimo/privado
2. Ou limpe manualmente:
   - Chrome: Ctrl+Shift+Del → Limpar dados de navegação
   - Firefox: Ctrl+Shift+Del → Limpar dados

### Problema: "Erro 422 ao fazer login"
**Solução:**
1. Verifique que o backend está rodando na porta 5000
2. Verifique que executou `flask db upgrade`
3. Verifique logs do Flask no terminal

### Problema: "Ainda não funciona depois de tudo"
**Solução: REINICIAR O PC**

Segundo o `BUG_JWT_PAUSADO.md`, isso resolve problemas de:
- Processos zombie do Python
- Cache de memória RAM
- Módulos Python carregados incorretamente

---

## 📚 Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `limpar_cache.bat` | Script automático para limpar cache Python |
| `limpar_tokens_browser.html` | Ferramenta visual para limpar tokens |
| `INSTRUCOES_LIMPAR_CACHE.md` | Este guia completo |

---

## ⚡ Atalho Rápido (Resumo)

```bash
# 1. Limpar cache Python
.\limpar_cache.bat

# 2. Abrir ferramenta de limpar tokens no browser
start limpar_tokens_browser.html

# 3. Reiniciar backend
cd backend
.venv\Scripts\activate
set PYTHONDONTWRITEBYTECODE=1
flask run

# 4. Reiniciar frontend (outro terminal)
cd frontend
npm start
```

---

**✅ Pronto! Agora você deve conseguir fazer login normalmente.**

**Data:** 2025-10-30
**Status:** Solução documentada e pronta para uso
