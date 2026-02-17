#!/usr/bin/env python3
"""
Script de correção emergencial para o banco SQLite no Render
Adiciona as colunas faltantes que as migrações não conseguiram criar
"""
import os
import sys
import sqlite3
from pathlib import Path

def fix_database():
    """Corrige o schema do banco de dados SQLite"""
    
    # Detecta ambiente (local ou produção)
    config = os.environ.get('FLASK_CONFIG', 'development')
    
    if config == 'production':
        # Produção: usa kaizen_prod.db
        db_path = Path(__file__).parent / 'kaizen_prod.db'
    else:
        # Desenvolvimento: usa kaizen_dev.db
        db_path = Path(__file__).parent / 'kaizen_dev.db'
    
    print(f"🔧 Iniciando correção do banco: {db_path}")
    print(f"   Ambiente: {config}")
    
    if not db_path.exists():
        print(f"❌ ERRO: Banco não encontrado em {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Verificar estrutura atual da tabela listas
        cursor.execute("PRAGMA table_info(listas)")
        columns = {row[1] for row in cursor.fetchall()}
        print(f"\n📋 Colunas atuais da tabela 'listas': {columns}")
        
        # Adicionar coluna 'deletado' se não existir
        if 'deletado' not in columns:
            print("   ➕ Adicionando coluna 'deletado'...")
            cursor.execute("ALTER TABLE listas ADD COLUMN deletado BOOLEAN NOT NULL DEFAULT 0")
            print("   ✅ Coluna 'deletado' adicionada")
        else:
            print("   ✓ Coluna 'deletado' já existe")
        
        # Adicionar coluna 'data_delecao' se não existir
        if 'data_delecao' not in columns:
            print("   ➕ Adicionando coluna 'data_delecao'...")
            cursor.execute("ALTER TABLE listas ADD COLUMN data_delecao DATETIME")
            print("   ✅ Coluna 'data_delecao' adicionada")
        else:
            print("   ✓ Coluna 'data_delecao' já existe")
        
        conn.commit()
        
        # Verificar estrutura da tabela fornecedores
        cursor.execute("PRAGMA table_info(fornecedores)")
        columns_forn = {row[1] for row in cursor.fetchall()}
        print(f"\n📋 Colunas atuais da tabela 'fornecedores': {columns_forn}")
        
        # Adicionar coluna 'responsavel' se não existir
        if 'responsavel' not in columns_forn:
            print("   ➕ Adicionando coluna 'responsavel'...")
            cursor.execute("ALTER TABLE fornecedores ADD COLUMN responsavel VARCHAR(100)")
            print("   ✅ Coluna 'responsavel' adicionada")
        else:
            print("   ✓ Coluna 'responsavel' já existe")
        
        # Adicionar coluna 'observacao' se não existir
        if 'observacao' not in columns_forn:
            print("   ➕ Adicionando coluna 'observacao'...")
            cursor.execute("ALTER TABLE fornecedores ADD COLUMN observacao VARCHAR(600)")
            print("   ✅ Coluna 'observacao' adicionada")
        else:
            print("   ✓ Coluna 'observacao' já existe")
        
        conn.commit()
        
        # Verificar tabela lista_mae_itens
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='lista_mae_itens'")
        if cursor.fetchone():
            cursor.execute("PRAGMA table_info(lista_mae_itens)")
            columns_items = {row[1] for row in cursor.fetchall()}
            print(f"\n📋 Colunas atuais da tabela 'lista_mae_itens': {columns_items}")
            
            if 'unidade' in columns_items:
                print("   ✓ Coluna 'unidade' existe")
            else:
                print("   ⚠️  AVISO: Coluna 'unidade' NÃO existe!")
        
        conn.close()
        
        print("\n✅ Correção do banco concluída com sucesso!")
        print("🚀 O servidor pode ser reiniciado agora.")
        return True
        
    except Exception as e:
        print(f"\n❌ ERRO durante correção: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = fix_database()
    sys.exit(0 if success else 1)
