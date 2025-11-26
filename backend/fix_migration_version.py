"""
Script para corrigir versão do Alembic no banco de dados.
Este script atualiza a tabela alembic_version para apontar para o head correto.
"""

import os
import sys

# Adicionar o diretório pai ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from kaizen_app import create_app
from kaizen_app.extensions import db

def fix_alembic_version():
    """Corrige a versão do Alembic para o head correto."""
    app = create_app(os.getenv('FLASK_CONFIG', 'production'))

    with app.app_context():
        try:
            # Verificar se a tabela alembic_version existe
            # Tentar query compatível com SQLite e PostgreSQL
            try:
                result = db.session.execute(db.text("SELECT version_num FROM alembic_version LIMIT 1"))
                current_version = result.scalar()
            except Exception:
                # Tabela não existe
                print("✓ Tabela alembic_version não existe ainda - migrations vão criá-la")
                return

            if not current_version:
                print("✓ Nenhuma versão no banco - migrations vão configurá-la")
                return

            print(f"Versão atual no banco: {current_version}")

            # Versões problemáticas que foram removidas
            problematic_versions = [
                '7e15fa804c55',  # create_lista_mae_item_status_auxiliary
                'f3a4b5c6d7e9',  # add_soft_delete_to_listas
                '2c3d4e5f6a71',  # add_lista_tarefas_table
            ]

            if current_version in problematic_versions:
                # Atualizar para o head correto
                correct_head = '74dbf5436c25'  # merge_migration_heads
                db.session.execute(
                    db.text("UPDATE alembic_version SET version_num = :version"),
                    {"version": correct_head}
                )
                db.session.commit()
                print(f"✓ Versão atualizada de {current_version} para {correct_head}")
            else:
                print(f"✓ Versão {current_version} está correta")

        except Exception as e:
            print(f"⚠️  Erro ao verificar/corrigir versão: {e}")
            print("Continuando com as migrations...")
            db.session.rollback()

if __name__ == '__main__':
    fix_alembic_version()
