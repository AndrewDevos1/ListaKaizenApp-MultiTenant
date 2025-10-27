import os

# Define o diretório base do projeto backend
basedir = os.path.abspath(os.path.dirname(__file__))


class Config:
    """Configurações base da aplicação."""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'uma-chave-secreta-muito-segura'

    # Configurações do Flask-JWT-Extended
    JWT_SECRET_KEY = SECRET_KEY
    JWT_TOKEN_LOCATION = ['headers']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'
    JWT_IDENTITY_CLAIM = 'sub'
    JWT_ERROR_MESSAGE_KEY = 'msg'

    SQLALCHEMY_TRACK_MODIFICATIONS = False


class DevelopmentConfig(Config):
    """Configurações para o ambiente de desenvolvimento."""
    SQLALCHEMY_DATABASE_URI = os.environ.get('DEV_DATABASE_URL') or \
        'sqlite:///' + os.path.join(basedir, '..', 'kaizen_dev.db')


class TestingConfig(Config):
    """Configurações para o ambiente de testes."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('TEST_DATABASE_URL') or \
        'sqlite:///' + os.path.join(basedir, '..', 'kaizen_test.db')


class ProductionConfig(Config):
    """Configurações para o ambiente de produção."""
    # ✅ CORRIGIDO: Se DATABASE_URL não existir, usa SQLite
    database_url = os.environ.get('DATABASE_URL') or 'sqlite:///kaizen_prod.db'

    # Fix para Render: converte postgres:// para postgresql://
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)

    # Adiciona sslmode=require para Render PostgreSQL
    if database_url.startswith('postgresql://') and '?sslmode' not in database_url:
        database_url += '?sslmode=require'

    SQLALCHEMY_DATABASE_URI = database_url


# Mapeamento de nomes para as classes de configuração
config_by_name = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
