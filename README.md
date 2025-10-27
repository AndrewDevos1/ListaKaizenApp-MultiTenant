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

## Sobre CORS em Desenvolvimento

O CORS está configurado de forma **dinâmica e automática** baseado no ambiente:

**Em Desenvolvimento (Local):**
- CORS aberto para TODAS as origens
- Funciona em qualquer rede/IP sem configuração
- Mude de rede (casa → trabalho → café) sem problemas
- Acesse de qualquer dispositivo na mesma rede local

**Como Funciona:**
O arquivo `backend/kaizen_app/__init__.py` detecta automaticamente:
- Se `FLASK_CONFIG=development` (padrão local) → CORS aberto para `*`
- Se `FLASK_CONFIG=production` (Render) → CORS restrito apenas a `https://lista-kaizen-app.vercel.app`

**Resultado:**
Você **nunca mais precisa editar configurações de CORS** ao mudar de rede. Simplesmente execute o backend e frontend localmente e tudo funciona!

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
