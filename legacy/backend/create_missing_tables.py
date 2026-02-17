"""
Script para criar tabelas que faltam no banco de produção
"""
import os
from kaizen_app import create_app, db
from sqlalchemy import text

# Criar app no modo production
config_name = os.getenv('FLASK_CONFIG', 'production')
app = create_app(config_name)

with app.app_context():
    # SQL para criar a tabela lista_mae_itens se não existir
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS lista_mae_itens (
        id SERIAL PRIMARY KEY,
        lista_mae_id INTEGER NOT NULL,
        nome VARCHAR(100) NOT NULL,
        unidade VARCHAR(20),
        quantidade_atual FLOAT DEFAULT 0,
        quantidade_minima FLOAT DEFAULT 0,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (lista_mae_id) REFERENCES listas(id) ON DELETE CASCADE
    );
    """

    try:
        db.session.execute(text(create_table_sql))
        db.session.commit()
        print("✅ Tabela lista_mae_itens criada com sucesso (ou já existe)")
    except Exception as e:
        print(f"❌ Erro ao criar tabela: {e}")
        db.session.rollback()
