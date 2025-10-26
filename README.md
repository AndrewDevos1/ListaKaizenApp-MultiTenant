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