# Kaizen Lists Web App

Este é um aplicativo web para automação do fluxo de gestão de estoque, geração de pedidos e controle de cotações, construído com Flask no backend e React no frontend.

## Estrutura do Projeto

```
kaizen-lists/
├── backend/         # Contém a aplicação Flask (monolito modular)
│   ├── kaizen_app/  # O código fonte da aplicação
│   ├── migrations/  # Scripts de migração do banco de dados
│   ├── tests/       # Testes do backend
│   └── ...
├── frontend/        # Contém a aplicação React
│   ├── src/
│   └── ...
├── planejamento/    # Contém o plano de ação do projeto
└── ...
```

## Configuração e Execução

### Backend

1.  **Navegue até o diretório do backend:**
    ```sh
    cd backend
    ```

2.  **Crie e ative um ambiente virtual:**
    ```sh
    python -m venv .venv
    source .venv/bin/activate  # No Linux/macOS
    .venv\Scripts\activate      # No Windows
    ```

3.  **Instale as dependências:**
    ```sh
    pip install -r requirements.txt
    ```

4.  **Configure o Banco de Dados:**
    *   Este projeto usa SQLite por padrão para desenvolvimento.
    *   Execute as migrações para criar o banco de dados e as tabelas:
        ```sh
        # Certifique-se de que a variável de ambiente FLASK_APP está configurada
        # export FLASK_APP=run.py (Linux/macOS)
        # set FLASK_APP=run.py (Windows)

        flask db upgrade
        ```

5.  **Execute o servidor de desenvolvimento:**
    ```sh
    flask run
    ```
    O servidor estará rodando em `http://127.0.0.1:5000`.

### Frontend

1.  **Navegue até o diretório do frontend:**
    ```sh
    cd frontend
    ```

2.  **Instale as dependências:**
    ```sh
    npm install
    ```

3.  **Execute o servidor de desenvolvimento:**
    ```sh
    npm start
    ```
    A aplicação estará disponível em `http://localhost:3000`.

## Guia Essencial para o Ambiente de Desenvolvimento

Para garantir que a aplicação funcione corretamente durante o desenvolvimento, especialmente ao testar em diferentes dispositivos (como celulares) na mesma rede, a seguinte configuração é **obrigatória**.

### 1. Configuração do Backend

O servidor Flask precisa ser acessível pela rede local.

*   **O que foi feito:** O arquivo `backend/run.py` foi configurado para iniciar o servidor em `host='0.0.0.0'`.
*   **Como Iniciar:** Use o comando `flask run` normalmente dentro da pasta `backend` (com o ambiente virtual ativado). O terminal deve indicar que o servidor está rodando em `http://0.0.0.0:5000/`.

### 2. Configuração do Frontend

O frontend precisa saber o endereço de IP do backend na sua rede.

1.  **Encontre seu IP Local:**
    *   No Windows, abra o terminal e digite `ipconfig`. Procure o "Endereço IPv4" do seu adaptador de Wi-Fi ou Ethernet.
    *   No Linux ou macOS, use `ifconfig` ou `ip addr`.

2.  **Crie o Arquivo de Ambiente:**
    *   Dentro da pasta `frontend`, crie um arquivo chamado `.env.local`.
    *   **Importante:** Este arquivo é para configurações locais e não deve ser enviado para o Git.

3.  **Adicione a URL da API:**
    *   Dentro do `.env.local`, adicione a seguinte linha, substituindo `<SEU_IP_AQUI>` pelo endereço que você encontrou:
        ```
        REACT_APP_API_URL=http://<SEU_IP_AQUI>:5000/api
        ```
    *   **Exemplo:** `REACT_APP_API_URL=http://192.168.88.122:5000/api`

4.  **Reinicie o Servidor:** Se o servidor do frontend (`npm start`) já estiver rodando, **pare-o (`Ctrl + C`) e inicie-o novamente** para que ele leia o novo arquivo `.env.local`.

### 3. Configuração de CORS

O backend já está configurado para aceitar conexões dos endereços `localhost`, do seu IP de rede local (`192.168.88.122`) e da Vercel. Se um novo desenvolvedor com um IP diferente se juntar ao projeto, seu IP precisará ser adicionado à lista de `origins` no arquivo `backend/kaizen_app/__init__.py`.

## Executando os Testes

### Testes do Backend

1.  A partir do diretório raiz do projeto, execute:
    ```sh
    pytest backend/tests/
    ```

### Testes do Frontend

1.  A partir do diretório `frontend`, execute:
    ```sh
    npm test
    ```

## Troubleshooting - Deploy em Produção (Render)

Esta seção documenta problemas comuns encontrados durante o deploy no Render e suas soluções.

### Erro 502 Bad Gateway Após Deploy

**Sintoma:**
- Backend retorna erro 502 Bad Gateway após deploy
- Login falha tanto em produção (Vercel) quanto em localhost
- Console do navegador mostra erros de CORS bloqueado
- Mensagem: `POST https://kaizen-lists-api.onrender.com/api/auth/... net::ERR_FAILED 502`

**Causa Raiz:**
Este erro geralmente ocorre quando **migrations do banco de dados não são executadas automaticamente** durante o deploy no Render. Quando o código backend é atualizado com novos campos nos models (ex: adição do campo `ativo` no modelo `Usuario`), mas a migration não roda no PostgreSQL de produção, o backend crasha ao tentar acessar colunas inexistentes.

**Exemplo Real:**
- Migration `32e43cab3e28_add_ativo_field_to_usuario_model.py` adicionou campo `ativo`
- Código em `services.py` passou a usar `if not user.ativo:`
- PostgreSQL de produção não tinha a coluna `ativo`
- SQLAlchemy gerava erro ao fazer query → Backend crashava → 502 retornado

### Solução Implementada

A solução definitiva foi criar um arquivo **`render.yaml`** na raiz do projeto que instrui o Render a executar migrations automaticamente durante cada deploy.

**Arquivo: `render.yaml`**
```yaml
services:
  - type: web
    name: kaizen-lists-api
    runtime: python
    rootDir: backend
    buildCommand: pip install -r requirements.txt && flask db upgrade
    startCommand: gunicorn -w 4 -b 0.0.0.0:$PORT run:app
    envVars:
      - key: FLASK_CONFIG
        value: production
```

**O Que Este Arquivo Faz:**
1. Define o serviço web Python no Render
2. Define `rootDir: backend` (arquivos procurados na pasta backend)
3. **Build Command:** Instala dependências **E EXECUTA MIGRATIONS** (`flask db upgrade`)
4. **Start Command:** Inicia app com gunicorn (4 workers)
5. **Environment Variables:** Força `FLASK_CONFIG=production`

**Por Que Funciona:**
- Antes: Render não sabia que precisava rodar `flask db upgrade`
- Depois: `render.yaml` instrui explicitamente a rodar migrations a cada deploy
- PostgreSQL sempre fica atualizado com o schema mais recente
- Backend não crasha ao acessar novos campos

### Verificação de Deploy Bem-Sucedido

Após configurar o `render.yaml` e fazer deploy:

1. **Verificar Logs do Render:**
   - Acesse: https://dashboard.render.com
   - Clique no serviço backend
   - Aba "Logs" → Procure por: `Running upgrade ... -> <migration_id>`
   - Se aparecer, migrations rodaram com sucesso ✅

2. **Testar Login em Produção:**
   - Acesse: https://lista-kaizen-app.vercel.app/login
   - Tente fazer login
   - Se retornar 200 OK ou 401 (credenciais inválidas) = Backend funcionando ✅
   - Se retornar 502/500 = Ainda há problema ❌

3. **Verificar Variáveis de Ambiente (Render Dashboard):**
   - Settings → Environment Variables
   - Confirme que `DATABASE_URL` está configurada (PostgreSQL)
   - Confirme que `FLASK_CONFIG=production` (pode estar no render.yaml)

### Documentação Adicional

Para detalhes completos sobre este problema e a resolução, consulte:
- **Relatório Detalhado:** `Manuais/anotacoes/RELATORIO_RESOLUCAO_DEPLOY_502.md`
- **Credenciais PostgreSQL:** `Manuais/anotacoes/credenciais_postgresql.md`

### Outros Problemas Comuns

**Problema:** CORS bloqueado em produção
- **Verificar:** `backend/kaizen_app/__init__.py` linhas 18-30
- **Solução:** Adicionar domínio Vercel na lista de `origins` permitidas

**Problema:** Banco de dados vazio após deploy
- **Causa:** Usando SQLite (efêmero) ao invés de PostgreSQL
- **Solução:** Configurar `DATABASE_URL` no Render apontando para PostgreSQL externo

## Boas Práticas de Desenvolvimento

Esta seção documenta o workflow correto para alterações em models e banco de dados, evitando problemas em produção.

### Workflow: Alterando Models e Criando Migrations

Toda vez que você alterar `backend/kaizen_app/models.py` (adicionar campos, criar tabelas, alterar relacionamentos), siga este processo:

#### 1. Altere o Modelo
```python
# Exemplo: Adicionando campo 'categoria_id' ao modelo Item
class Item(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    categoria_id = db.Column(db.Integer, db.ForeignKey('categorias.id'))  # NOVO
```

#### 2. Crie a Migration Automaticamente
```bash
cd backend
flask db migrate -m "add categoria_id to Item model"
```

Isso gera um arquivo em `backend/migrations/versions/XXXX_add_categoria_id_to_item_model.py`

#### 3. Revise a Migration Gerada
Abra o arquivo gerado e verifique se os comandos estão corretos. SQLAlchemy nem sempre detecta tudo perfeitamente.

#### 4. Aplique Localmente e Teste
```bash
flask db upgrade
flask run
# Teste a aplicação para garantir que funciona
```

#### 5. Commit Models + Migration Juntos
```bash
git add backend/kaizen_app/models.py backend/migrations/versions/XXXX_*.py
git commit -m "feat: Add categoria_id field to Item model"
```

#### 6. Push e Deploy Automático
```bash
git push origin develop  # ou master
```

O Render executará automaticamente `flask db upgrade` via `render.yaml`, atualizando o PostgreSQL de produção.

### ⚠️ IMPORTANTE: Sempre Commitar Migrations

**Problema:** Se você alterar `models.py` mas NÃO commitar a migration:
- ❌ Seu SQLite local: Atualizado (você rodou `flask db upgrade`)
- ❌ PostgreSQL Render: **DESATUALIZADO** (migration não existe)
- ❌ Backend crasha ao acessar novos campos
- ❌ Resultado: **502 Bad Gateway**

**Solução:** Sempre commitar `models.py` + arquivo de migration juntos.

### Diferenças Entre Ambientes

| Aspecto | Desenvolvimento Local | Produção (Render) |
|---------|----------------------|-------------------|
| **Banco de Dados** | SQLite (`backend/kaizen_dev.db`) | PostgreSQL (Render) |
| **Config** | `DevelopmentConfig` | `ProductionConfig` |
| **Variável ENV** | `FLASK_CONFIG=development` (padrão) | `FLASK_CONFIG=production` (render.yaml) |
| **Migrations** | Manual via `flask db upgrade` | Automático via `render.yaml` |
| **Dados** | Locais, podem ser deletados | Persistentes, compartilhados |

### Checklist Antes de Push para Master

Use este checklist antes de fazer push para evitar problemas:

- [ ] Alterei algum modelo em `models.py`?
  - [ ] Se sim: Rodei `flask db migrate -m "descrição"`?
  - [ ] Migration gerada em `backend/migrations/versions/`?
  - [ ] Revisei o conteúdo da migration?
  - [ ] Rodei `flask db upgrade` localmente?
  - [ ] Testei a aplicação localmente (login, features)?
- [ ] Adicionei novos `print()` ou logs com emojis?
  - [ ] Se sim: Removi todos os emojis (podem causar erros de encoding no Windows)
- [ ] Commitei `models.py` E a migration juntos?
- [ ] Mensagem de commit descreve claramente as mudanças?
- [ ] Branch está atualizada com `develop`/`master`?

### Problemas Comuns e Soluções Rápidas

**Problema:** Login falha com 502 após deploy
- **Causa:** Migration não foi executada no Render
- **Solução:** Verificar `render.yaml` tem `flask db upgrade` no `buildCommand`

**Problema:** CORS bloqueado em produção
- **Causa:** Domínio não está na lista de origins permitidas
- **Solução:** Adicionar domínio em `backend/kaizen_app/__init__.py` linhas 18-30

**Problema:** Login falha localmente após pull
- **Causa:** Migrations novas não foram aplicadas no seu SQLite
- **Solução:** Rodar `cd backend && flask db upgrade`

**Problema:** Tabela/coluna não existe em produção
- **Causa:** Migration foi criada mas não commitada/pusheada
- **Solução:** Commitar migration e fazer novo deploy

**Problema:** Emojis causando erros no console
- **Causa:** Windows tem problemas com emojis UTF-8 em logs
- **Solução:** Usar apenas ASCII em `console.log()`, `print()`, etc

### ORM e Relacionamentos

✅ **SQLAlchemy cuida automaticamente de:**
- Foreign keys e constraints
- Relacionamentos (One-to-Many, Many-to-Many)
- Cascade deletes (se configurado)
- Serialização via `.to_dict()`

⚠️ **Você precisa cuidar de:**
- Criar migrations após alterar models
- Commitar migrations junto com models
- Rodar `flask db upgrade` localmente para testar
- Revisar migrations geradas (SQLAlchemy pode errar)

### Documentação de Referência

Para mais detalhes sobre problemas específicos:
- **Erro 502 Detalhado:** `Manuais/anotacoes/RELATORIO_RESOLUCAO_DEPLOY_502.md`
- **Credenciais PostgreSQL:** `Manuais/anotacoes/credenciais_postgresql.md`
- **Histórico CORS/Rede:** `Manuais/anotacoes/historicoGemini.md`
- **Guia de Retomada:** `Manuais/anotacoes/credenciais_postgresql.md` (seção "Próximos Passos")