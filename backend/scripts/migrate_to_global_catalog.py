#!/usr/bin/env python3
"""
Script de Migração: Catálogo Global de Itens

Migra de: ListaMaeItem com lista_mae_id (itens por lista)
Para: ListaMaeItem global + ListaItemRef (tabela intermediária)

Execução:
    cd backend
    .venv/bin/python scripts/migrate_to_global_catalog.py
"""
import sys
import os
from datetime import datetime

# Adicionar o diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def run_migration():
    from kaizen_app import create_app, db
    from sqlalchemy import text

    app = create_app()
    with app.app_context():
        conn = db.engine.connect()
        trans = conn.begin()

        try:
            print("=" * 60)
            print("MIGRAÇÃO: Catálogo Global de Itens")
            print("=" * 60)
            print()

            # 1. Verificar estado atual
            result = conn.execute(text("SELECT COUNT(*) FROM lista_mae_itens"))
            total_antes = result.scalar()
            print(f"1. Verificando estado atual...")
            print(f"   Itens na tabela antiga: {total_antes}")

            if total_antes == 0:
                print("\n⚠️  Nenhum item para migrar. Abortando.")
                trans.rollback()
                return

            # 2. Criar tabela lista_item_ref
            print("\n2. Criando tabela lista_item_ref...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS lista_item_ref (
                    lista_id INTEGER NOT NULL,
                    item_id INTEGER NOT NULL,
                    quantidade_atual FLOAT DEFAULT 0 NOT NULL,
                    quantidade_minima FLOAT DEFAULT 1.0 NOT NULL,
                    criado_em DATETIME,
                    atualizado_em DATETIME,
                    PRIMARY KEY (lista_id, item_id),
                    FOREIGN KEY(lista_id) REFERENCES listas(id) ON DELETE CASCADE,
                    FOREIGN KEY(item_id) REFERENCES lista_mae_itens(id) ON DELETE CASCADE
                )
            """))
            print("   ✓ Tabela lista_item_ref criada")

            # 3. Criar tabela temporária para itens consolidados
            print("\n3. Consolidando itens por nome único...")
            conn.execute(text("DROP TABLE IF EXISTS lista_mae_itens_new"))
            conn.execute(text("""
                CREATE TABLE lista_mae_itens_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nome VARCHAR(255) NOT NULL UNIQUE,
                    unidade VARCHAR(50) NOT NULL DEFAULT 'un',
                    criado_em DATETIME,
                    atualizado_em DATETIME
                )
            """))

            # 4. Inserir itens únicos (consolidar por nome)
            # Prioriza a unidade do primeiro item encontrado
            conn.execute(text("""
                INSERT OR IGNORE INTO lista_mae_itens_new (nome, unidade, criado_em, atualizado_em)
                SELECT
                    TRIM(nome),
                    COALESCE(
                        (SELECT unidade FROM lista_mae_itens lmi2
                         WHERE TRIM(lmi2.nome) = TRIM(lmi.nome)
                         ORDER BY lmi2.id LIMIT 1),
                        'un'
                    ),
                    MIN(criado_em),
                    MAX(atualizado_em)
                FROM lista_mae_itens lmi
                WHERE TRIM(nome) != ''
                GROUP BY TRIM(nome)
            """))

            result = conn.execute(text("SELECT COUNT(*) FROM lista_mae_itens_new"))
            itens_unicos = result.scalar()
            print(f"   ✓ {itens_unicos} itens únicos criados (de {total_antes} originais)")

            # 5. Criar referências na tabela intermediária
            print("\n4. Criando referências lista ↔ item...")
            now = datetime.utcnow().isoformat()
            conn.execute(text(f"""
                INSERT OR REPLACE INTO lista_item_ref
                    (lista_id, item_id, quantidade_atual, quantidade_minima, criado_em, atualizado_em)
                SELECT
                    lmi.lista_mae_id,
                    lmin.id,
                    COALESCE(lmi.quantidade_atual, 0),
                    CASE
                        WHEN COALESCE(lmi.quantidade_minima, 0) <= 0 THEN 1.0
                        ELSE lmi.quantidade_minima
                    END,
                    '{now}',
                    '{now}'
                FROM lista_mae_itens lmi
                JOIN lista_mae_itens_new lmin ON TRIM(lmi.nome) = lmin.nome
                WHERE lmi.lista_mae_id IS NOT NULL
            """))

            result = conn.execute(text("SELECT COUNT(*) FROM lista_item_ref"))
            total_refs = result.scalar()
            print(f"   ✓ {total_refs} referências criadas")

            # 6. Substituir tabela antiga
            print("\n5. Substituindo tabela antiga...")
            conn.execute(text("DROP TABLE IF EXISTS lista_mae_itens_backup"))
            conn.execute(text("ALTER TABLE lista_mae_itens RENAME TO lista_mae_itens_backup"))
            conn.execute(text("ALTER TABLE lista_mae_itens_new RENAME TO lista_mae_itens"))
            print("   ✓ Tabela substituída (backup mantido como 'lista_mae_itens_backup')")

            # 7. Commit
            trans.commit()

            # 8. Verificar resultado final
            print("\n" + "=" * 60)
            print("RESULTADO DA MIGRAÇÃO")
            print("=" * 60)

            conn2 = db.engine.connect()

            result = conn2.execute(text("SELECT COUNT(*) FROM lista_mae_itens"))
            print(f"✓ Itens no catálogo global: {result.scalar()}")

            result = conn2.execute(text("SELECT COUNT(*) FROM lista_item_ref"))
            print(f"✓ Referências lista↔item: {result.scalar()}")

            result = conn2.execute(text("SELECT COUNT(DISTINCT lista_id) FROM lista_item_ref"))
            print(f"✓ Listas com itens: {result.scalar()}")

            # Mostrar exemplo
            print("\nExemplo de itens no catálogo global:")
            result = conn2.execute(text("SELECT id, nome, unidade FROM lista_mae_itens LIMIT 5"))
            for row in result:
                print(f"  - [{row[0]}] {row[1]} ({row[2]})")

            print("\n✅ Migração concluída com sucesso!")
            print("\n⚠️  Próximos passos:")
            print("   1. Verificar se a aplicação funciona corretamente")
            print("   2. Se tudo OK, remover backup: DROP TABLE lista_mae_itens_backup")
            print("   3. Executar: flask db migrate -m 'global catalog migration'")

            conn2.close()

        except Exception as e:
            print(f"\n❌ ERRO durante migração: {e}")
            trans.rollback()
            print("   Rollback executado. Banco de dados restaurado.")
            raise

if __name__ == '__main__':
    run_migration()
