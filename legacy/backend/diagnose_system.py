#!/usr/bin/env python3
"""
Script de diagnóstico pós-deploy para o Render
Verifica se tudo está funcionando corretamente
"""
import os
import sys
import sqlite3
from pathlib import Path

def check_environment():
    """Verifica variáveis de ambiente"""
    print("🔧 DIAGNÓSTICO DO AMBIENTE\n")
    print("=" * 50)
    
    config = os.environ.get('FLASK_CONFIG', 'development')
    flask_app = os.environ.get('FLASK_APP', 'não definido')
    db_url = os.environ.get('DATABASE_URL', 'não definido')
    
    print(f"✅ FLASK_CONFIG: {config}")
    print(f"✅ FLASK_APP: {flask_app}")
    print(f"✅ DATABASE_URL: {'(vazio - usando SQLite)' if db_url == '' else db_url}")
    print("=" * 50 + "\n")

def check_database():
    """Verifica estrutura do banco de dados"""
    print("🗄️  DIAGNÓSTICO DO BANCO DE DADOS\n")
    print("=" * 50)
    
    config = os.environ.get('FLASK_CONFIG', 'development')
    if config == 'production':
        db_path = Path(__file__).parent / 'kaizen_prod.db'
    else:
        db_path = Path(__file__).parent / 'kaizen_dev.db'
    
    print(f"📁 Caminho do banco: {db_path}")
    
    if not db_path.exists():
        print(f"❌ ERRO: Banco não encontrado!")
        return False
    
    print(f"✅ Banco existe (tamanho: {db_path.stat().st_size / 1024:.2f} KB)")
    
    try:
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Listar tabelas
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = [row[0] for row in cursor.fetchall()]
        
        print(f"\n📊 Total de tabelas: {len(tables)}")
        print(f"   Tabelas: {', '.join(tables[:5])}...")
        
        # Verificar tabela listas
        if 'listas' in tables:
            cursor.execute("PRAGMA table_info(listas)")
            columns = {row[1] for row in cursor.fetchall()}
            
            print(f"\n📋 Tabela 'listas':")
            print(f"   Colunas: {', '.join(sorted(columns))}")
            
            # Verificar colunas críticas
            critical_cols = ['deletado', 'data_delecao']
            for col in critical_cols:
                status = "✅" if col in columns else "❌"
                print(f"   {status} {col}")
            
            cursor.execute("SELECT COUNT(*) FROM listas")
            count = cursor.fetchone()[0]
            print(f"   📊 Total de registros: {count}")
        
        # Verificar tabela fornecedores
        if 'fornecedores' in tables:
            cursor.execute("PRAGMA table_info(fornecedores)")
            columns = {row[1] for row in cursor.fetchall()}
            
            print(f"\n📋 Tabela 'fornecedores':")
            print(f"   Colunas: {', '.join(sorted(columns))}")
            
            critical_cols = ['responsavel', 'observacao']
            for col in critical_cols:
                status = "✅" if col in columns else "❌"
                print(f"   {status} {col}")
            
            cursor.execute("SELECT COUNT(*) FROM fornecedores")
            count = cursor.fetchone()[0]
            print(f"   📊 Total de registros: {count}")
        
        # Verificar tabela usuarios
        if 'usuarios' in tables:
            cursor.execute("SELECT COUNT(*) FROM usuarios WHERE role='ADMIN'")
            admin_count = cursor.fetchone()[0]
            print(f"\n👥 Usuários ADMIN: {admin_count}")
        
        conn.close()
        print("=" * 50 + "\n")
        return True
        
    except Exception as e:
        print(f"\n❌ ERRO ao acessar banco: {e}")
        import traceback
        traceback.print_exc()
        return False

def check_routes():
    """Verifica se as rotas estão registradas"""
    print("🛣️  DIAGNÓSTICO DAS ROTAS\n")
    print("=" * 50)
    
    try:
        from kaizen_app import create_app
        
        app = create_app(os.environ.get('FLASK_CONFIG', 'development'))
        
        # Contar rotas por blueprint
        routes = {}
        for rule in app.url_map.iter_rules():
            if rule.endpoint != 'static':
                bp = rule.endpoint.split('.')[0] if '.' in rule.endpoint else 'root'
                routes[bp] = routes.get(bp, 0) + 1
        
        print(f"✅ Total de rotas registradas: {sum(routes.values())}")
        for bp, count in sorted(routes.items()):
            print(f"   {bp}: {count} rotas")
        
        # Verificar rotas críticas
        critical_routes = [
            '/api/auth/login',
            '/api/admin/dashboard-summary',
            '/api/v1/listas',
            '/api/v1/fornecedores'
        ]
        
        print(f"\n🔍 Rotas críticas:")
        all_routes = [str(rule) for rule in app.url_map.iter_rules()]
        for route in critical_routes:
            found = any(route in r for r in all_routes)
            status = "✅" if found else "❌"
            print(f"   {status} {route}")
        
        print("=" * 50 + "\n")
        return True
        
    except Exception as e:
        print(f"\n❌ ERRO ao verificar rotas: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Executa todos os diagnósticos"""
    print("\n" + "=" * 50)
    print("🔬 DIAGNÓSTICO COMPLETO DO SISTEMA")
    print("=" * 50 + "\n")
    
    results = []
    
    # Verifica ambiente
    check_environment()
    
    # Verifica banco
    results.append(("Banco de Dados", check_database()))
    
    # Verifica rotas
    results.append(("Rotas", check_routes()))
    
    # Resumo
    print("\n" + "=" * 50)
    print("📊 RESUMO DO DIAGNÓSTICO")
    print("=" * 50)
    
    all_ok = True
    for name, ok in results:
        status = "✅ OK" if ok else "❌ ERRO"
        print(f"{status}: {name}")
        if not ok:
            all_ok = False
    
    print("=" * 50 + "\n")
    
    if all_ok:
        print("✅ Todos os sistemas operacionais!")
        return 0
    else:
        print("❌ Alguns sistemas com problemas. Verifique os logs acima.")
        return 1

if __name__ == '__main__':
    sys.exit(main())
