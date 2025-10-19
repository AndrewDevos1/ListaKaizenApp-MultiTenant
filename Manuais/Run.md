Terminal 1: Rodar o Backend (Servidor)
Ative o ambiente virtual do Python:

shell
backend\.venv\Scripts\activate
Você verá (.venv) aparecer no início da linha do seu terminal.

Navegue até a pasta do backend:

shell
cd backend
Inicie o servidor Flask:

shell
flask run
ou 
python run.py
O servidor do backend estará rodando em http://127.0.0.1:5000. Deixe este terminal aberto.

Terminal 2: Rodar o Frontend (Interface)
Inicie o servidor de desenvolvimento do React: (Este comando deve ser executado a partir da pasta raiz do projeto, não de dentro da pasta frontend).
shell
npm start --prefix frontend
Isso deve abrir automaticamente uma nova aba no seu navegador com a aplicação rodando em http://localhost:3000.
Seguindo esses passos, a aplicação completa estará no ar para você testar.