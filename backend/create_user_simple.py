# -*- coding: utf-8 -*-
"""
Script Simplificado para Criar Usuario Admin
Sem emojis para compatibilidade com Windows
"""

import sys
import os

# Adiciona o backend ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from kaizen_app import create_app
from kaizen_app.models import Usuario, UserRoles
from kaizen_app.extensions import db
from werkzeug.security import generate_password_hash

def main():
    # Credenciais do admin
    EMAIL = "andrew.andyoo@gmail.com"
    SENHA = "210891"
    NOME = "Andrew"

    # Cria app
    app = create_app('default')

    with app.app_context():
        # Garante que tabelas existem
        db.create_all()
        print("Banco de dados inicializado")

        # Verifica se usuario existe
        user = Usuario.query.filter_by(email=EMAIL).first()

        if user:
            print("\n[ATUALIZAR] Usuario ja existe!")
            print(f"  Email: {user.email}")
            print(f"  Nome: {user.nome}")
            print(f"  Role: {user.role.value}")
            print(f"  Aprovado: {'Sim' if user.aprovado else 'Nao'}")
            print(f"  ID: {user.id}")

            # Atualiza
            user.senha_hash = generate_password_hash(SENHA)
            user.aprovado = True
            user.role = UserRoles.ADMIN
            db.session.commit()
            print("\n[OK] Senha atualizada e usuario definido como ADMIN aprovado!")

        else:
            print("\n[CRIAR] Criando novo usuario admin...")

            # Cria usuario
            user = Usuario(
                nome=NOME,
                email=EMAIL,
                senha_hash=generate_password_hash(SENHA),
                role=UserRoles.ADMIN,
                aprovado=True
            )

            db.session.add(user)
            db.session.commit()

            print("\n[OK] Usuario admin criado com sucesso!")
            print(f"  Email: {user.email}")
            print(f"  Nome: {user.nome}")
            print(f"  Role: {user.role.value}")
            print(f"  Aprovado: {'Sim' if user.aprovado else 'Nao'}")
            print(f"  ID: {user.id}")

        print("\n" + "="*60)
        print("CREDENCIAIS DE ACESSO:")
        print(f"  Email: {EMAIL}")
        print(f"  Senha: {SENHA}")
        print("="*60)
        print("\nAcesse: http://localhost:3000/login")
        print("Backend: http://127.0.0.1:5000")

if __name__ == "__main__":
    print("="*60)
    print("SCRIPT DE CRIACAO DE USUARIO ADMIN")
    print("="*60)

    try:
        main()
    except Exception as e:
        print(f"\n[ERRO] {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    print("\n[CONCLUIDO] Script finalizado!")
