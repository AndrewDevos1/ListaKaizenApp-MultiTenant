No seu terminal, que já está no lugar certo (D:\Codigos VSCode\Kaizen_lista_app\backend) e com o
  ambiente virtual (.venv) ativado, por favor, copie e cole os comandos abaixo, um de cada vez, e 
  pressione Enter após cada um:

   1. Primeiro, defina a variável de ambiente:
   1     $env:FLASK_APP = "run.py"

   2. Agora, crie a migração (este comando deve funcionar agora):
   1     flask db migrate -m "Adiciona status ao modelo Pedido"

   3. Se o comando acima gerar um arquivo de migração na pasta migrations/versions, o último passo é
      aplicar a mudança no banco de dados:
   1     flask db upgrade


 aconteceu isto tudo certo?

✦ Não, ainda não está tudo certo. Esses erros No such command 'db' e Could not import 'run' mostram que o terminal não está
  encontrando os comandos do banco de dados nem o seu aplicativo Flask.

  O problema é que você está executando os comandos na pasta errada. Você precisa estar dentro da pasta `backend` para que tudo
  funcione.

  Vamos tentar do jeito certo. Por favor, siga exatamente estes passos:

   1. Primeiro, e mais importante, entre na pasta backend:
   1     cd backend
      Seu terminal deve agora mostrar `D:\Codigos VSCode\Kaizen_lista_app\backend>`.

   2. Agora, dentro da pasta backend, defina a variável de ambiente:
   1     $env:FLASK_APP = "run.py"

   3. Execute o comando para criar a migração:
   1     flask db migrate -m "Adiciona status ao modelo Pedido"

   4. Se o passo 3 funcionar, execute o comando para aplicar a migração:

   1     flask db upgrade

  A chave de tudo é executar os comandos de dentro da pasta `backend`. Me diga se agora vai