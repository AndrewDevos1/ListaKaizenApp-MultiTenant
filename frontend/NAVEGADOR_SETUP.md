# 🦊 Configuração de Navegador - Frontend

## 📋 Resumo

O frontend foi configurado para **abrir automaticamente no Firefox** ao executar `npm start`. Se o Firefox não estiver instalado, o navegador padrão do sistema será usado automaticamente.

---

## 🚀 Como Usar

### Iniciar com Abertura Automática no Firefox

```bash
cd frontend
npm start
```

**Comportamento:**
1. ✅ React Scripts inicia o servidor na porta 3000
2. ✅ Aguarda o servidor ficar pronto
3. ✅ Tenta abrir no Firefox
4. ✅ Se Firefox não existir, abre no navegador padrão do sistema
5. ✅ Exibe mensagens informativas no console

### Iniciar SEM Abrir Navegador Automaticamente

Se você preferir não abrir o navegador automaticamente:

```bash
npm run start:no-browser
```

O servidor continuará rodando normalmente em http://localhost:3000, mas nenhum navegador será aberto.

---

## 🔧 Arquitetura

### Scripts Criados

**`scripts/open-browser.js`**
- Detecta o SO (Windows, macOS, Linux)
- Tenta abrir Firefox com fallback para navegador padrão
- Exibe mensagens amigáveis no console

**`scripts/wait-and-open.js`**
- Aguarda o servidor React ficar pronto (porta 3000 respondendo)
- Chama `open-browser.js` quando pronto
- Máximo de 60 tentativas com timeout de 1 segundo

### Dependências Adicionadas

```json
{
  "devDependencies": {
    "concurrently": "^9.2.1",
    "open": "^10.2.0"
  }
}
```

- **concurrently**: Executa `react-scripts start` e `wait-and-open.js` em paralelo
- **open**: Abre URLs em navegadores (multiplataforma)

---

## 📊 Scripts Disponíveis

| Comando | Função |
|---------|--------|
| `npm start` | Inicia React + abre Firefox/navegador padrão |
| `npm run start:no-browser` | Inicia React SEM abrir navegador |
| `npm run build` | Build para produção |
| `npm test` | Executa testes |

---

## 🎯 Suporte de Plataformas

| OS | Suporte |
|----|---------|
| Windows | ✅ Firefox + Fallback |
| macOS | ✅ Firefox + Fallback |
| Linux | ✅ Firefox + Fallback |

---

## 📝 Exemplos de Saída

### Cenário 1: Firefox Instalado

```
⏳ Aguardando servidor React na porta 3000...
⏳ Tentativa 10/60...
✅ Servidor pronto!
🦊 Abrindo Firefox...
✅ Firefox aberto em http://localhost:3000
```

### Cenário 2: Firefox NÃO Instalado

```
⏳ Aguardando servidor React na porta 3000...
✅ Servidor pronto!
⚠️ Firefox não encontrado. Abrindo no navegador padrão...
✅ Navegador padrão aberto em http://localhost:3000
```

---

## 🐛 Troubleshooting

### Problema: Nenhum navegador abre

**Solução 1:** Verifique se o servidor está rodando
```bash
curl http://localhost:3000
```

**Solução 2:** Tente o modo sem navegador automático
```bash
npm run start:no-browser
```

**Solução 3:** Acesse manualmente em http://localhost:3000

### Problema: Firefox não abre mesmo estando instalado

**Solução:** Verifique se o caminho para Firefox está no PATH
```bash
# Windows
where firefox

# macOS/Linux
which firefox
```

### Problema: Muitas tentativas antes de abrir

Isso é normal! O servidor React leva alguns segundos para ficar pronto. Se passar de 60 segundos, verifique se há erros na compilação.

---

## 🔄 Referência Rápida

```bash
# Iniciar normalmente (abre Firefox)
npm start

# Iniciar sem abrir navegador
npm run start:no-browser

# Em outra aba do terminal, abrir manualmente
cd frontend
node scripts/open-browser.js http://localhost:3000
```

---

**Criado em:** 25/10/2025
**Última atualização:** 25/10/2025
