import os
from kaizen_app import create_app

# Carrega a configuração a partir da variável de ambiente
# Usa 'production' em produção (Render/Deploy), 'development' localmente
config_name = os.getenv('FLASK_CONFIG', 'development')
print(f"[RUN.PY] Loading config: {config_name}")
app = create_app(config_name)

if __name__ == '__main__':
    app.run()
