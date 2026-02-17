# 📋 Guia de Importação de Estoque

**Data:** 24/12/2025  
**Versão:** 1.0  
**Branch:** importacao-completa

---

## 🎯 Visão Geral

A funcionalidade de **Importação de Estoque** permite adicionar múltiplos itens ao estoque de forma rápida, copiando dados diretamente do Excel ou Google Sheets.

---

## 📊 Formatos Suportados

### 1. Formato Simples (apenas nomes)

Cole apenas os nomes dos itens, um por linha:

```
Alga Nori
ARROZ GRAO CURTO HEISEI FARDO (6X5KG)
Açúcar Refinado
Feijão Preto
Óleo de Soja
```

**Resultado:**
- Itens criados com quantidades zeradas
- Usuário configura quantidades depois

---

### 2. Formato Completo (com quantidades)

Cole dados com 3 colunas separadas por TAB:

```
Alga Nori                                   2    6
ARROZ GRAO CURTO HEISEI FARDO (6X5KG)      7    6
Açúcar Refinado                             3    10
Feijão Preto                                5    8
Óleo de Soja                                1    5
```

**Colunas:**
1. **Nome do Item** - Pode ter espaços
2. **Quantidade Atual** - Estoque disponível
3. **Quantidade Mínima** - Limite para pedido

**Separadores aceitos:**
- TAB (recomendado - copiado do Excel)
- Múltiplos espaços (2 ou mais)

---

## 🚀 Como Usar

### Passo 1: Preparar dados no Excel/Sheets

**Opção A: Apenas nomes**
```
| Item                                    |
|----------------------------------------|
| Alga Nori                              |
| ARROZ GRAO CURTO                       |
| Açúcar Refinado                        |
```

**Opção B: Com quantidades**
```
| Item                    | Qtd Atual | Qtd Mínima |
|-------------------------|-----------|------------|
| Alga Nori              | 2         | 6          |
| ARROZ GRAO CURTO       | 7         | 6          |
| Açúcar Refinado        | 3         | 10         |
```

### Passo 2: Copiar do Excel

1. Selecione as linhas no Excel/Sheets
2. Ctrl+C (ou Cmd+C no Mac)
3. Os dados são copiados com TAB entre colunas

### Passo 3: Importar no Sistema

1. Acesse **Estoque** → Área desejada
2. Clique em **"Importar Itens"**
3. Cole os dados na área de texto
4. Selecione **Área** e **Fornecedor**
5. Marque **"Atualizar itens existentes"** (opcional)
6. Clique em **"Ver Preview"**

### Passo 4: Revisar Preview

O sistema mostra:
- ✅ Formato detectado (Simples ou Completo)
- ✅ Total de itens válidos
- ⚠️ Erros encontrados (se houver)
- 📊 Tabela com todos os itens

### Passo 5: Confirmar

1. Revise os dados na tabela
2. Confira Área e Fornecedor
3. Clique em **"Confirmar Importação"**
4. ✅ Sucesso! Itens adicionados ao estoque

---

## ⚙️ Configurações

### Atualizar Itens Existentes

**Marcado (padrão):**
- Itens que já existem terão quantidades atualizadas
- Não cria duplicados

**Desmarcado:**
- Itens existentes são ignorados
- Apenas novos itens são criados

### Área e Fornecedor

**Obrigatórios** para importação:
- **Área:** Local do estoque (ex: Cozinha, Depósito)
- **Fornecedor:** Responsável pelo fornecimento

**Nota:** Unidade de medida é definida como "UN" por padrão. Configure depois no cadastro do item.

---

## ✅ Validações

O sistema valida automaticamente:

✓ Nomes não vazios  
✓ Quantidades são números válidos  
✓ Quantidades não negativas  
✓ Formato correto (3 colunas se completo)  
✓ Linhas vazias são ignoradas  

**Erros comuns:**
- ❌ "Formato inválido" → Faltam colunas ou separadores
- ❌ "Número inválido" → Texto no lugar de número
- ❌ "Quantidade negativa" → Use valores >= 0

---

## 📝 Exemplos Práticos

### Exemplo 1: Importação Simples

**Excel:**
```
Alga Nori
ARROZ GRAO CURTO
Açúcar Refinado
```

**Resultado:**
- 3 itens criados
- Qtd Atual = 0
- Qtd Mínima = 0

---

### Exemplo 2: Importação Completa

**Excel:**
```
Item                Atual    Mínima
Alga Nori          2        6
ARROZ GRAO CURTO   7        6
Açúcar Refinado    3        10
```

**Copie sem cabeçalho:**
```
Alga Nori          2        6
ARROZ GRAO CURTO   7        6
Açúcar Refinado    3        10
```

**Resultado:**
- 3 itens criados
- Quantidades preenchidas
- Pronto para uso

---

### Exemplo 3: Com Erros

**Dados colados:**
```
Alga Nori          2        6
ARROZ GRAO CURTO   abc      6
Açúcar Refinado    3        10
Item Sem Qtd       
```

**Preview mostra:**
- ✅ 2 itens válidos (Alga Nori, Açúcar Refinado)
- ❌ 2 erros:
  - Linha 2: Número inválido (abc)
  - Linha 4: Formato inválido

**Ação:**
- Corrija os erros no Excel
- Cole novamente
- Ou importe apenas os válidos

---

## 🎨 Interface do Usuário

### Modal de Importação

```
┌─────────────────────────────────────────────────┐
│ 📤 Importar Itens para Estoque            [X]   │
├─────────────────────────────────────────────────┤
│                                                 │
│ ℹ️  Formatos aceitos:                           │
│  • Simples: Apenas nomes                        │
│  • Completo: Nome [TAB] Qtd Atual [TAB] Mínima │
│                                                 │
│ Cole os dados aqui:                             │
│ ┌─────────────────────────────────────────────┐ │
│ │ Alga Nori          2        6               │ │
│ │ ARROZ GRAO CURTO   7        6               │ │
│ │                                             │ │
│ └─────────────────────────────────────────────┘ │
│ ✅ 2 linha(s) carregada(s)                      │
│                                                 │
│ Área: [Cozinha           ▼]                    │
│ Fornecedor: [Fornecedor A ▼]                   │
│ ☑ Atualizar itens existentes                   │
│                                                 │
├─────────────────────────────────────────────────┤
│                    [Cancelar] [Ver Preview]     │
└─────────────────────────────────────────────────┘
```

### Tela de Preview

```
┌─────────────────────────────────────────────────┐
│ Preview da Importação                           │
├─────────────────────────────────────────────────┤
│ Formato: Completo   10 válidos   2 erros        │
│                                                 │
│ ⚠️  Erros encontrados:                           │
│  • Linha 5: Formato inválido                    │
│  • Linha 8: Número inválido                     │
│                                                 │
│ ┌───┬─────────────────┬────────┬─────────────┐  │
│ │ # │ Nome            │ Atual  │ Mínima      │  │
│ ├───┼─────────────────┼────────┼─────────────┤  │
│ │ 1 │ Alga Nori       │ 2      │ 6           │  │
│ │ 2 │ ARROZ GRAO      │ 7      │ 6           │  │
│ │...│ ...             │ ...    │ ...         │  │
│ └───┴─────────────────┴────────┴─────────────┘  │
│                                                 │
│ Área: Cozinha                                   │
│ Fornecedor: Fornecedor A                        │
│ Atualizar existentes: Sim                       │
│                                                 │
├─────────────────────────────────────────────────┤
│                 [Voltar] [Confirmar Importação] │
└─────────────────────────────────────────────────┘
```

---

## 🔧 Troubleshooting

### Problema: "Formato inválido"

**Causa:** Dados não estão no formato correto

**Solução:**
1. Certifique-se que copiou com TAB (do Excel)
2. Se formato completo: 3 colunas obrigatórias
3. Se formato simples: apenas nomes

---

### Problema: "Número inválido"

**Causa:** Texto onde deveria ser número

**Solução:**
1. Verifique células de quantidade
2. Remova letras ou símbolos
3. Use apenas números (pode ter decimal: 3.5)

---

### Problema: Itens duplicados

**Causa:** Item já existe no estoque

**Solução:**
1. Marque "Atualizar itens existentes"
2. Ou: Desmarque para ignorar duplicados

---

### Problema: Não detecta formato completo

**Causa:** Separação incorreta das colunas

**Solução:**
1. Use TAB entre colunas (copie do Excel)
2. Ou: Use 2+ espaços entre colunas
3. Evite 1 espaço apenas

---

## 📊 Estatísticas

Após importação, você verá:

```
✅ Importação concluída!
   5 item(ns) criado(s)
   3 atualizado(s)
   0 erro(s)
```

---

## 💡 Dicas

### Para melhor experiência:

✓ **Prepare no Excel** - Mais fácil de organizar  
✓ **Revise antes** - Confira dados antes de copiar  
✓ **Use Preview** - Sempre veja antes de confirmar  
✓ **Organize por área** - Importe área por área  
✓ **Backup primeiro** - Exporte estoque atual antes  

### Atalhos:

- **Ctrl+C** - Copiar do Excel
- **Ctrl+V** - Colar no sistema
- **Tab** - Navegar entre campos
- **Enter** - Confirmar (em preview)

---

## 📞 Suporte

Se precisar de ajuda:

1. Consulte este guia
2. Veja exemplos práticos
3. Entre em contato com suporte técnico

---

**Última atualização:** 24/12/2025 05:54 BRT  
**Versão do sistema:** 1.0.0  
**Branch:** importacao-completa
