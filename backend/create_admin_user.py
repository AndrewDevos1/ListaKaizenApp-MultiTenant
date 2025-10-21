#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script para criar usuário administrador
Uso: python create_admin_user.py

DOCUMENTAÇÃO:
- Verifica se o usuário já existe antes de criar
- Cria o usuário com role ADMIN
- Marca como aprovado automaticamente
- Usa hash seguro para a senha (Werkzeug)
"""

import os
import sys

# Adiciona o diretório do backend ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from kaizen_app import create_app
from kaizen_app.models import Usuario, UserRoles
from kaizen_app.extensions import db
from werkzeug.security import generate_password_hash

def create_admin():
    """Cria o usuário administrador."""

    # Dados do administrador
    ADMIN_EMAIL = "andrew.andyoo@gmail.com"
    ADMIN_PASSWORD = "210891"
    ADMIN_NAME = "Andrew"

    # Cria o app
    app = create_app('default')

    with app.app_context():
        # Verifica se o banco de dados está inicializado
        try:
            db.create_all()
            print("✅ Banco de dados inicializado")
        except Exception as e:
            print(f"⚠️  Aviso ao criar tabelas: {e}")

        # Verifica se o usuário já existe
        existing_user = Usuario.query.filter_by(email=ADMIN_EMAIL).first()

        if existing_user:
            print(f"\n⚠️  USUÁRIO JÁ EXISTE!")
            print(f"   Email: {existing_user.email}")
            print(f"   Nome: {existing_user.nome}")
            print(f"   Role: {existing_user.role.value}")
            print(f"   Aprovado: {'Sim' if existing_user.aprovado else 'Não'}")
            print(f"   ID: {existing_user.id}")
            print(f"   Criado em: {existing_user.criado_em}")

            # Pergunta se quer atualizar a senha
            resposta = input("\n🔄 Deseja atualizar a senha deste usuário? (s/n): ")

            if resposta.lower() == 's':
                existing_user.senha_hash = generate_password_hash(ADMIN_PASSWORD)
                existing_user.aprovado = True
                existing_user.role = UserRoles.ADMIN
                db.session.commit()
                print("✅ Senha atualizada com sucesso!")
            else:
                print("❌ Nenhuma alteração foi feita.")

            return

        # Cria o hash da senha
        senha_hash = generate_password_hash(ADMIN_PASSWORD)

        # Cria o usuário administrador
        admin_user = Usuario(
            nome=ADMIN_NAME,
            email=ADMIN_EMAIL,
            senha_hash=senha_hash,
            role=UserRoles.ADMIN,
            aprovado=True
        )

        # Adiciona ao banco
        db.session.add(admin_user)
        db.session.commit()

        print("\n✅ USUÁRIO ADMINISTRADOR CRIADO COM SUCESSO!")
        print(f"   Email: {admin_user.email}")
        print(f"   Nome: {admin_user.nome}")
        print(f"   Role: {admin_user.role.value}")
        print(f"   Aprovado: {'Sim' if admin_user.aprovado else 'Não'}")
        print(f"   ID: {admin_user.id}")
        print(f"   Criado em: {admin_user.criado_em}")

        print("\n📋 CREDENCIAIS DE ACESSO:")
        print(f"   Email: {ADMIN_EMAIL}")
        print(f"   Senha: {ADMIN_PASSWORD}")

        print("\n🔗 Para fazer login, acesse:")
        print("   Frontend: http://localhost:3000/login")
        print("   Ou use a API: POST /api/auth/login")

if __name__ == "__main__":
    print("=" * 60)
    print("🔧 SCRIPT DE CRIAÇÃO DE USUÁRIO ADMINISTRADOR")
    print("=" * 60)
    print()

    try:
        create_admin()
    except Exception as e:
        print(f"\n❌ ERRO ao criar usuário: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    print("\n" + "=" * 60)
    print("✅ Script finalizado com sucesso!")
    print("=" * 60)
