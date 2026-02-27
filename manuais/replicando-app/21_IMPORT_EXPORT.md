# 21 — Import / Export

> Importação e exportação de dados em CSV para fornecedores, itens e listas. Suporta import em lote, preview antes de confirmar, e export de múltiplos tipos em ZIP.

---

## Conceito

O sistema suporta movimentação de dados via CSV para:
- Fornecedores (exportar/importar lista de fornecedores)
- Itens de fornecedores (importar catálogo por fornecedor)
- Itens de lista (exportar/importar itens de uma lista específica)
- Export em bulk (múltiplos tipos em ZIP)

---

## Endpoints

### Fornecedores

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/api/fornecedores/export-csv` | ADMIN | Exportar fornecedores (`?restaurante_id=`) |
| POST | `/api/fornecedores/import-csv` | ADMIN | Importar fornecedores (body: CSV raw text) |
| POST | `/api/fornecedores/<id>/itens/import-csv` | ADMIN | Importar itens de fornecedor (file upload) |
| POST | `/api/fornecedores/<id>/itens/import-text` | ADMIN | Importar itens via texto |

### Listas

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/api/admin/listas/<id>/export-csv` | ADMIN | Exportar itens da lista |
| POST | `/api/admin/listas/<id>/import-csv` | ADMIN | Importar itens para lista (file upload) |

### Bulk / Preview

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| POST | `/api/admin/database/export-bulk` | ADMIN | Export múltiplos tipos em ZIP |
| POST | `/api/admin/import/preview` | ADMIN | Preview do que seria importado |
| POST | `/api/admin/import/execute` | ADMIN | Executar importação após preview |

---

## Formatos CSV

### Fornecedores (export/import)

**Colunas:** `Nome, Contato, Meio de Envio, Responsável, Observação`

**Export:**
- `Content-Disposition: attachment; filename=fornecedores.csv`
- Vírgulas em campos de texto são escapadas como ponto-e-vírgula

**Import:**
```
POST /api/fornecedores/import-csv
Content-Type: text/plain
Body: <conteúdo CSV como texto raw>
```
- Pula linhas sem nome
- Detecta duplicatas por nome no mesmo restaurante (pula, não sobrescreve)
- **Resposta:**
```json
{
  "message": "3 fornecedor(es) criado(s)",
  "fornecedores_criados": 3,
  "fornecedores_duplicados": 1
}
```

### Itens de Fornecedor (import)

**Colunas:** `nome_item, codigo_fornecedor, unidade_medida, preco`

**Via CSV file upload:**
```
POST /api/fornecedores/:id/itens/import-csv
Content-Type: multipart/form-data
file: <arquivo.csv>
```

**Via texto:**
```json
POST /api/fornecedores/:id/itens/import-text
{
  "items": [
    {"nome": "Cebola", "unidade": "kg", "preco": 3.50},
    {"nome": "Alho", "unidade": "kg", "preco": 12.00}
  ]
}
```

### Itens de Lista (export/import)

**Colunas:** `nome, unidade, quantidade_atual, quantidade_minima`

**Export:**
```
GET /api/admin/listas/:id/export-csv
Content-Disposition: attachment; filename="{lista_nome}_{YYYY-MM-DD}.csv"
```

**Import:**
```
POST /api/admin/listas/:id/import-csv
Content-Type: multipart/form-data
file: <arquivo.csv>
```
- **Substitui** todos os itens existentes (não é merge)
- Cria `ListaMaeItem` para itens novos não existentes no catálogo
- Cria/atualiza `ListaItemRef` para o relacionamento

---

## Lógica de Serviço

### exportar_fornecedores_csv() (services.py:5628)

```python
def exportar_fornecedores_csv(restaurante_id):
    fornecedores = Fornecedor.query.filter_by(restaurante_id=restaurante_id).all()
    linhas = ["Nome,Contato,Meio de Envio,Responsável,Observação"]
    for f in fornecedores:
        linha = f"{escape(f.nome)},{escape(f.contato)},..."
        linhas.append(linha)
    return {"csv": "\n".join(linhas)}, 200
```

### importar_fornecedores_csv() (services.py:5653)

```python
def importar_fornecedores_csv(csv_content, restaurante_id):
    reader = csv.DictReader(io.StringIO(csv_content))
    criados = 0
    duplicados = 0
    for row in reader:
        if not row.get('Nome'):
            continue
        existe = Fornecedor.query.filter_by(
            nome=row['Nome'], restaurante_id=restaurante_id
        ).first()
        if existe:
            duplicados += 1
            continue
        novo = Fornecedor(nome=row['Nome'], restaurante_id=restaurante_id, ...)
        db.session.add(novo)
        criados += 1
    db.session.commit()
    return {"fornecedores_criados": criados, "fornecedores_duplicados": duplicados}, 200
```

### export_lista_to_csv() (services.py:6108)

```python
def export_lista_to_csv(lista_id, restaurante_id):
    lista = Lista.query.filter_by(id=lista_id, restaurante_id=restaurante_id).first()
    itens_ref = ListaItemRef.query.filter_by(lista_id=lista_id).all()

    linhas = ["nome,unidade,quantidade_atual,quantidade_minima"]
    for ref in itens_ref:
        linhas.append(f"{ref.item.nome},{ref.item.unidade},{ref.quantidade_atual},{ref.quantidade_minima}")

    filename = f"{lista.nome}_{date.today()}.csv"
    return {"csv_content": "\n".join(linhas), "filename": filename}, 200
```

### import_lista_from_csv() (services.py:6162)

```python
def import_lista_from_csv(lista_id, csv_file, restaurante_id):
    # Deleta itens existentes da lista
    ListaItemRef.query.filter_by(lista_id=lista_id).delete()

    reader = csv.DictReader(csv_file.stream)
    for row in reader:
        # Busca ou cria item no catálogo global
        item = ListaMaeItem.query.filter_by(
            nome=row['nome'], restaurante_id=restaurante_id
        ).first()
        if not item:
            item = ListaMaeItem(nome=row['nome'], unidade=row['unidade'], ...)
            db.session.add(item)
            db.session.flush()

        # Cria referência na lista
        ref = ListaItemRef(
            lista_id=lista_id,
            item_id=item.id,
            quantidade_atual=row.get('quantidade_atual') or 0,
            quantidade_minima=row.get('quantidade_minima') or 0
        )
        db.session.add(ref)

    db.session.commit()
```

---

## Bulk Export

```json
POST /api/admin/database/export-bulk
{
  "tipos_dados": ["fornecedores", "itens", "listas"]
}
```

- Cria arquivo ZIP com um CSV por tipo de dado
- `Content-Disposition: attachment; filename=kaizen_export_{date}.zip`
- Útil para backup completo do restaurante

---

## Import Preview / Execute

**Preview:**
```json
POST /api/admin/import/preview
{
  "dados": [...],
  "tipo": "items"
}
```
Retorna o que **seria** importado sem confirmar — para revisão antes de executar.

**Execute:**
```json
POST /api/admin/import/execute
{
  "dados": [...],
  "tipo": "items"
}
```
Executa de fato a importação. Transacional: rollback em caso de erro.

---

## Regras de Negócio

1. Importação de fornecedores: duplicatas por nome são **ignoradas** (não sobrescreve)
2. Importação de itens de lista: **substitui** todos os itens (não faz merge)
3. Arquivo deve ter extensão `.csv`
4. Restaurante é obrigatório para segurança multi-tenant
5. Todas as importações são transacionais (all-or-nothing, rollback em erro)
6. CSV usa vírgula como separador; textos com vírgula são escapados com ponto-e-vírgula

---

## Integração no Frontend

**GerenciarItensLista.tsx** inclui:
- Botão "Exportar CSV" → `GET /admin/listas/:id/export-csv` → download automático
- Botão "Importar CSV" → file input → `POST /admin/listas/:id/import-csv`
- Feedback de sucesso/erro após importação

---

## Resumo de Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `backend/kaizen_app/services.py` | `exportar_fornecedores_csv`, `importar_fornecedores_csv`, `export_lista_to_csv`, `import_lista_from_csv` |
| `backend/kaizen_app/controllers.py` | Rotas de export/import |
| `frontend/src/features/admin/GerenciarItensLista.tsx` | Botões de importação/exportação de lista |
