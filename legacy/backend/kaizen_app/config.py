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
    JWT_BLACKLIST_ENABLED = True
    JWT_BLOCKLIST_ENABLED = True

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Timezone da aplicação (Horário de Brasília)
    TIMEZONE = 'America/Sao_Paulo'  # BRT/BRST (UTC-3/-2)


class DevelopmentConfig(Config):
    """Configurações para o ambiente de desenvolvimento."""
    # Usar PostgreSQL do Railway também no desenvolvimento
    database_url = os.environ.get('DEV_DATABASE_URL') or os.environ.get('DATABASE_URL')
    
    if not database_url:
        # Fallback para SQLite apenas se não houver PostgreSQL configurado
        sqlite_path = os.path.join(basedir, '..', 'kaizen_dev.db')
        database_url = f'sqlite:///{sqlite_path}'
        print(f"⚠️  PostgreSQL não configurado. Usando SQLite: {sqlite_path}")
    else:
        # Fix para Railway: postgres:// → postgresql://
        if database_url.startswith('postgres://'):
            database_url = database_url.replace('postgres://', 'postgresql://', 1)
        print(f"✅ Usando PostgreSQL no desenvolvimento")
    
    SQLALCHEMY_DATABASE_URI = database_url


class TestingConfig(Config):
    """Configurações para o ambiente de testes."""
    TESTING = True
    # Usar PostgreSQL também nos testes (com database separado)
    database_url = os.environ.get('TEST_DATABASE_URL')
    
    if not database_url:
        # Fallback para SQLite apenas em testes locais sem PostgreSQL
        sqlite_path = os.path.join(basedir, '..', 'kaizen_test.db')
        database_url = f'sqlite:///{sqlite_path}'
    else:
        # Fix para Railway: postgres:// → postgresql://
        if database_url.startswith('postgres://'):
            database_url = database_url.replace('postgres://', 'postgresql://', 1)
    
    SQLALCHEMY_DATABASE_URI = database_url


class ProductionConfig(Config):
    """Configurações para o ambiente de produção (Railway)."""
    # Railway fornece DATABASE_URL automaticamente
    database_url = os.environ.get('DATABASE_URL')
    
    if not database_url:
        # Fallback para SQLite em produção (não recomendado, mas evita crash)
        sqlite_path = os.path.join(basedir, '..', 'kaizen_prod.db')
        database_url = f'sqlite:///{sqlite_path}'
        print(f"⚠️  AVISO: DATABASE_URL não configurado! Usando SQLite temporário.")
    else:
        # Fix para compatibilidade: postgres:// → postgresql://
        if database_url.startswith('postgres://'):
            database_url = database_url.replace('postgres://', 'postgresql://', 1)
        
        # Configurações específicas para PostgreSQL
        if database_url.startswith('postgresql://'):
            # Remove query params existentes
            if '?' in database_url:
                database_url = database_url.split('?')[0]
            
            # Adiciona parâmetros SSL seguros para Railway
            database_url += '?sslmode=prefer&connect_timeout=10'
            print(f"✅ Usando PostgreSQL em produção")
    
    SQLALCHEMY_DATABASE_URI = database_url


# Mapeamento de nomes para as classes de configuração
config_by_name = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
