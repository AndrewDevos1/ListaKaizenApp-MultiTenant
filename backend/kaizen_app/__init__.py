from flask import Flask
from .config import config_by_name
from .extensions import db, migrate, jwt, cors

def create_app(config_name='default'):
    """Application Factory Function"""
    app = Flask(__name__)

    # Carrega as configurações
    app.config.from_object(config_by_name[config_name])

    # Inicializa as extensões
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}}) # Configuração básica de CORS para a API

    with app.app_context():
        # Importa e registra os Blueprints
        from .controllers import auth_bp, admin_bp, api_bp
        app.register_blueprint(auth_bp)
        app.register_blueprint(admin_bp)
        app.register_blueprint(api_bp)

        return app
