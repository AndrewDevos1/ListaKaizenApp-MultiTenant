"""
Script para criar colaborador Joya
"""
import sys
import os

# Adiciona o diretório backend ao path para importar os módulos
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from kaizen_app import create_app
from kaizen_app.extensions import db
from kaizen_app.models import Usuario, UserRole
from werkzeug.security import generate_password_hash

def create_collaborator_joya():
    """Cria o colaborador Joya"""
    app = create_app('development')

    with app.app_context():
        # Verificar se já existe um usuário com este email
        existing_user = Usuario.query.filter_by(email='joya@kaizen.com').first()

        if existing_user:
            print(f"❌ Usuário com email 'joya@kaizen.com' já existe!")
            print(f"   ID: {existing_user.id}")
            print(f"   Nome: {existing_user.nome}")
            print(f"   Role: {existing_user.role}")
            return

        # Criar novo colaborador
        novo_colaborador = Usuario(
            nome='Joya Silva',
            username='joya',
            email='joya@kaizen.com',
            senha_hash=generate_password_hash('123456'),
            role=UserRole.COLLABORATOR,
            aprovado=True  # Já aprovado para poder fazer login
        )

        db.session.add(novo_colaborador)
        db.session.commit()

        print("✅ Colaborador Joya criado com sucesso!")
        print(f"   ID: {novo_colaborador.id}")
        print(f"   Nome: {novo_colaborador.nome}")
        print(f"   Username: {novo_colaborador.username}")
        print(f"   Email: {novo_colaborador.email}")
        print(f"   Senha: 123456")
        print(f"   Role: {novo_colaborador.role}")
        print(f"   Aprovado: {novo_colaborador.aprovado}")
        print("\n🎯 Você pode fazer login com:")
        print(f"   Email: joya@kaizen.com")
        print(f"   OU Username: joya")
        print(f"   Senha: 123456")

if __name__ == '__main__':
    create_collaborator_joya()
