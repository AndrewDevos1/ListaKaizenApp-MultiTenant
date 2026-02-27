#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Script para criar o restaurante KZN e vincular usuários existentes."""
from kaizen_app import create_app, db
from kaizen_app.models import Restaurante, Usuario, UserRoles


def criar_restaurante_kzn():
    app = create_app()

    with app.app_context():
        kzn = Restaurante.query.filter_by(slug='kzn').first()
        if not kzn:
            kzn = Restaurante(
                nome='KZN Restaurante',
                slug='kzn',
                ativo=True
            )
            db.session.add(kzn)
            db.session.commit()
            print(f"✅ Restaurante KZN criado com sucesso (ID: {kzn.id})")
            print(f"   Nome: {kzn.nome}")
            print(f"   Slug: {kzn.slug}")
        else:
            print("⚠️  Restaurante KZN já existe.")

        usuarios_sem_restaurante = Usuario.query.filter(
            Usuario.restaurante_id.is_(None),
            Usuario.role != UserRoles.SUPER_ADMIN
        ).all()

        for usuario in usuarios_sem_restaurante:
            usuario.restaurante_id = kzn.id

        if usuarios_sem_restaurante:
            db.session.commit()
            print(f"✅ {len(usuarios_sem_restaurante)} usuário(s) vinculados ao KZN.")


if __name__ == "__main__":
    criar_restaurante_kzn()
