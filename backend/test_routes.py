#!/usr/bin/env python3
"""
Script de teste das rotas do backend
Verifica se todas as rotas principais estão registradas corretamente
"""
import sys
import os

# Adiciona o diretório backend ao path
sys.path.insert(0, os.path.dirname(__file__))

from kaizen_app import create_app

def test_routes():
    """Testa se todas as rotas estão registradas"""
    app = create_app('production')
    
    print("🔍 Verificando rotas registradas no Flask...\n")
    
    # Rotas esperadas
    expected_routes = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/admin/dashboard-summary',
        '/api/admin/users',
        '/api/admin/listas/deleted',
        '/api/v1/listas',
        '/api/v1/fornecedores',
        '/api/v1/areas',
        '/api/v1/items',
    ]
    
    # Pega todas as rotas registradas
    routes = []
    for rule in app.url_map.iter_rules():
        if rule.endpoint != 'static':
            routes.append(str(rule))
    
    print(f"✅ Total de rotas registradas: {len(routes)}\n")
    
    # Verifica rotas esperadas
    print("📋 Verificando rotas críticas:\n")
    all_good = True
    
    for expected in expected_routes:
        found = any(expected in route for route in routes)
        status = "✅" if found else "❌"
        print(f"{status} {expected}")
        if not found:
            all_good = False
    
    # Lista rotas admin_bp
    print("\n📂 Rotas do admin_bp:")
    admin_routes = [r for r in routes if '/api/admin' in r]
    for route in sorted(admin_routes)[:10]:
        print(f"   {route}")
    
    # Lista rotas api_bp
    print("\n📂 Rotas do api_bp:")
    api_routes = [r for r in routes if '/api/v1' in r]
    for route in sorted(api_routes)[:10]:
        print(f"   {route}")
    
    if all_good:
        print("\n✅ Todas as rotas críticas estão registradas!")
        return 0
    else:
        print("\n❌ Algumas rotas críticas estão faltando!")
        return 1

if __name__ == '__main__':
    exit_code = test_routes()
    sys.exit(exit_code)
