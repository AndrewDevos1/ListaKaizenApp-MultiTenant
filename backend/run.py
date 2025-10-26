import os
from kaizen_app import create_app

# Carrega a configuração a partir da variável de ambiente ou usa 'default'
config_name = os.getenv('FLASK_CONFIG') or 'default'
app = create_app(config_name)

if __name__ == '__main__':
    app.run(host='0.0.0.0')
