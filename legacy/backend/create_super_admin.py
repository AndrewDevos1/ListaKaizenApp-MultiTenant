#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Script para criar o primeiro usuário SUPER_ADMIN do sistema."""
import sys
from werkzeug.security import generate_password_hash
from kaizen_app import create_app, db
from kaizen_app.models import Usuario, UserRoles


def criar_super_admin():
    app = create_app()

    with app.app_context():
        print("\n=== Criar SUPER ADMIN ===\n")

        super_admin_existente = Usuario.query.filter_by(
            role=UserRoles.SUPER_ADMIN
        ).first()

        if super_admin_existente:
            print(f"⚠️  Já existe um SUPER ADMIN: {super_admin_existente.email}")
            resposta = input("Deseja criar outro SUPER ADMIN? (s/n): ").lower()
            if resposta != 's':
                print("Operação cancelada.")
                return

        nome = input("Nome completo: ").strip()
        email = input("Email: ").strip()
        senha = input("Senha: ").strip()

        if not nome or not email or not senha:
            print("❌ Todos os campos são obrigatórios.")
            sys.exit(1)

        usuario_existente = Usuario.query.filter_by(email=email).first()
        if usuario_existente:
            print(f"❌ Já existe um usuário com o email '{email}'.")
            sys.exit(1)

        super_admin = Usuario(
            nome=nome,
            email=email,
            senha_hash=generate_password_hash(senha),
            role=UserRoles.SUPER_ADMIN,
            aprovado=True,
            ativo=True
        )

        db.session.add(super_admin)
        db.session.commit()

        print("\n✅ SUPER ADMIN criado com sucesso!")
        print(f"   Nome: {nome}")
        print(f"   Email: {email}")
        print("   Role: SUPER_ADMIN")
        print("\n🔐 Faça login com estas credenciais.")


if __name__ == "__main__":
    criar_super_admin()
