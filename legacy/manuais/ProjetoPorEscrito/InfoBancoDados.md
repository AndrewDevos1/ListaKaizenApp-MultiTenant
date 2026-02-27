Para que a IA de código gere corretamente o esquema de banco de dados e a lógica de conexão, forneça as seguintes especificações e arquivos de configuração:

1. Variáveis de Ambiente (arquivo .env)  
```
# PostgreSQL  
DB_HOST=localhost  
DB_PORT=5432  
DB_NAME=kaizen_lists_db  
DB_USER=seu_usuario  
DB_PASSWORD=sua_senha  
FLASK_ENV=development  
SECRET_KEY=uma_chave_secreta  
```

2. Configuração do SQLAlchemy em config.py  
```python
import os

class Config:
    SQLALCHEMY_DATABASE_URI = (
        f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
        f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = os.getenv('SECRET_KEY')
```

3. Inicialização da extensão no backend/extensions.py  
```python
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def init_extensions(app):
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app)
```

4. Estrutura de models.py (exemplo de entidade Usuário)  
```python
from .extensions import db
from datetime import datetime

class Usuario(db.Model):
    __tablename__ = "usuarios"
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    senha_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.Enum("ADMIN","COLLABORATOR", name="user_roles"), nullable=False)
    criado_em = db.Column(db.DateTime, default=datetime.utcnow)
```

5. Script de criação e conexão em run.py  
```python
from flask import Flask
from kaizen_app.config import Config
from kaizen_app.extensions import init_extensions, db
from kaizen_app.controllers import register_blueprints

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    init_extensions(app)
    register_blueprints(app)
    return app

if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        db.create_all()
    app.run(host="0.0.0.0", port=5000)
```

Com essas configurações, a IA de código terá todas as informações para:
- Definir o **schema** do PostgreSQL com SQLAlchemy  
- Gerar as classes de modelo para cada entidade  
- Conectar-se ao banco usando as variáveis de ambiente  
- Criar e migrar o esquema automaticamente no startup do Flask