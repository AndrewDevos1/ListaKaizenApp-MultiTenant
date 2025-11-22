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
    # Lista de tabelas para criar
    tables_sql = [
        # Tabela lista_mae_itens
        """
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
        """,
        # Tabela fornecedor_lista (relacionamento many-to-many)
        """
        CREATE TABLE IF NOT EXISTS fornecedor_lista (
            id SERIAL PRIMARY KEY,
            fornecedor_id INTEGER NOT NULL,
            lista_id INTEGER NOT NULL,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE CASCADE,
            FOREIGN KEY (lista_id) REFERENCES listas(id) ON DELETE CASCADE,
            UNIQUE(fornecedor_id, lista_id)
        );
        """
    ]

    # Executar criação de cada tabela
    for i, sql in enumerate(tables_sql, 1):
        try:
            db.session.execute(text(sql))
            db.session.commit()
            print(f"✅ Tabela {i} criada com sucesso (ou já existe)")
        except Exception as e:
            print(f"❌ Erro ao criar tabela {i}: {e}")
            db.session.rollback()
