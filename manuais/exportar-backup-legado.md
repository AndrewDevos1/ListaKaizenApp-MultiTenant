# Como Exportar o Backup do Legado para Importar no Multi-Tenant

Este guia explica **exatamente quais arquivos exportar** no sistema legado (Flask) e **como organizá-los** para que a importação no novo sistema (NestJS/Multi-Tenant) funcione corretamente.

---

## Visão Geral do Processo

A importação no novo sistema é feita em **2 fases**:

| Fase | O que faz | Arquivo(s) necessário(s) |
|------|-----------|--------------------------|
| **Fase 1** | Cria fornecedores, áreas, itens e listas | Um ZIP com 4 CSVs |
| **Fase 2** | Vincula os itens a cada lista com quantidades | Um CSV por lista |

---

## FASE 1 — Exportar o ZIP de Backup

### Onde exportar no legado

No sistema legado, acesse:
**Admin → Configurações → Exportar Dados**

Marque os seguintes tipos de dados (e **apenas eles** — o novo sistema só usa estes 4):

- [x] Fornecedores
- [x] Áreas
- [x] Itens
- [x] Listas

Clique em **"Exportar Selecionados"**. Um arquivo `.zip` será baixado.

---

### Estrutura esperada do ZIP

O ZIP deve conter exatamente estes arquivos (os nomes precisam ser exatos, em minúsculas):

```
backup_kaizen_YYYY-MM-DD.zip
├── fornecedores.csv
├── areas.csv
├── itens.csv
└── listas.csv
```

> Os arquivos `pedidos.csv`, `cotacoes.csv`, `estoque.csv` e `usuarios.csv` **são ignorados** pelo importador — não causam erro, mas não são usados.

---

### Formato de cada CSV no ZIP

#### `fornecedores.csv`
```
ID,Nome,Contato,Telefone,Email,Responsável,Observação
1,Distribuidora ABC,João,11999990000,abc@email.com,,
2,Laticínios XYZ,,21988880000,,,Fornecedor regional
```
O importador usa as colunas: **Nome** (col 2), **Telefone** (col 4), **Email** (col 5).
As demais colunas são ignoradas.

#### `areas.csv`
```
ID,Nome,Descrição
1,Cozinha,Área principal de preparo
2,Bar,
```
O importador usa apenas: **Nome** (col 2).

#### `itens.csv`
```
ID,Nome,Unidade Medida,Fornecedor,Data Criação
1,Arroz,kg,Distribuidora ABC,2024-01-15 10:00:00
2,Leite,L,Laticínios XYZ,2024-01-15 10:00:00
3,Sal,kg,,2024-01-15 10:00:00
```
O importador usa: **Nome** (col 2), **Unidade Medida** (col 3), **Fornecedor** (col 4, opcional).
> **IMPORTANTE:** O nome do fornecedor em `itens.csv` deve ser idêntico ao nome em `fornecedores.csv` — o vínculo é feito por nome exato.

#### `listas.csv`
```
ID,Nome,Descrição,Data Criação,Colaboradores
1,Lista Semanal de Compras,,2024-01-15 10:00:00,Maria
2,Estoque do Bar,,2024-01-15 10:00:00,Pedro, João
```
O importador usa apenas: **Nome** (col 2).
Colaboradores não são migrados automaticamente.

---

## FASE 2 — Exportar CSVs por Lista

### Por que é necessário?

O arquivo `estoque.csv` do backup geral **não contém a coluna de qual lista cada item pertence**, por isso não pode ser usado para vincular itens a listas automaticamente. A única forma correta é exportar **cada lista individualmente**.

### Como exportar no legado

Para **cada lista** que deseja migrar:

1. Acesse **Admin → Listas → [nome da lista]**
2. Clique em **"Exportar CSV desta lista"** (ou botão equivalente na tela de detalhes da lista)
3. Salve o arquivo — ele será nomeado automaticamente como `NomeDaLista_YYYY-MM-DD.csv`

### Formato do CSV por lista

```
nome,unidade,quantidade_atual,quantidade_minima
Arroz,kg,12.0,5.0
Leite,L,0.0,10.0
Sal,kg,3.5,2.0
```

O importador usa todas as 4 colunas:
- `nome` — deve ser **idêntico** ao nome do item importado na Fase 1
- `unidade` — informativo (não sobrescreve o item)
- `quantidade_atual` — estoque atual no momento da exportação
- `quantidade_minima` — quantidade mínima para gerar pedido

> O cabeçalho da primeira linha é obrigatório (será ignorado automaticamente na leitura).

---

## Como importar no novo sistema

### Fase 1

1. No novo sistema, acesse **Admin → Configurações**
2. Seção **"Importar Dados do Legado"**
3. **Fase 1:** Selecione o `.zip` exportado e clique em **"Importar ZIP"**
4. Aguarde o resumo: quantos fornecedores, áreas, itens e listas foram criados ou ignorados

### Fase 2

5. **Fase 2:** Selecione a lista na dropdown
6. Selecione o CSV correspondente a essa lista (exportado no passo anterior)
7. Clique em **"Importar CSV da Lista"**
8. Repita para cada lista

---

## Regras de Idempotência (seguro re-executar)

O importador **não cria duplicatas**. Se um item já existir com o mesmo nome:
- Ele será marcado como "ignorado" no resumo
- Nenhum erro será lançado
- Você pode importar mais de uma vez com segurança

---

## Checklist de Exportação

Antes de enviar o ZIP para o novo sistema, verifique:

- [ ] O ZIP contém `fornecedores.csv`
- [ ] O ZIP contém `areas.csv`
- [ ] O ZIP contém `itens.csv`
- [ ] O ZIP contém `listas.csv`
- [ ] Os nomes dos arquivos estão em **minúsculas** (`fornecedores.csv` e não `Fornecedores.csv`)
- [ ] O CSV de itens usa o **mesmo nome de fornecedor** que aparece em `fornecedores.csv`
- [ ] Para cada lista, você tem um CSV individual exportado pela tela de detalhes da lista

---

## Erros Comuns e Soluções

| Erro | Causa | Solução |
|------|-------|---------|
| `Arquivo ZIP inválido` | ZIP corrompido ou formato errado | Re-exportar o backup no legado |
| Item aparece em `naoEncontrados` na Fase 2 | Nome do item no CSV da lista é diferente do cadastrado na Fase 1 | Conferir ortografia exata — o match é **case-insensitive mas precisa coincidir** |
| Fornecedor não vinculado ao item | Nome do fornecedor em `itens.csv` diferente de `fornecedores.csv` | Conferir se o nome é idêntico nas duas colunas |
| Listas criadas mas sem itens | Fase 1 cria as listas vazias — itens são vinculados só na Fase 2 | Normal — importar os CSVs por lista na Fase 2 |
| BOM no CSV (caracteres estranhos no início) | Excel salva CSV com UTF-8 BOM | O importador remove automaticamente — não é problema |
