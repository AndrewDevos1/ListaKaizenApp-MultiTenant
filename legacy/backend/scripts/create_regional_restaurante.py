from kaizen_app import create_app, db
from kaizen_app.models import Restaurante


def main():
    app = create_app()
    with app.app_context():
        restaurante = Restaurante.query.filter_by(
            slug="fornecedores-regionais",
            deletado=False
        ).first()
        if not restaurante:
            restaurante = Restaurante.query.filter_by(
                nome="Fornecedores Regionais",
                deletado=False
            ).first()

        if restaurante:
            print(f"Restaurante Regional ja existe com ID {restaurante.id}")
            return

        novo = Restaurante(
            nome="Fornecedores Regionais",
            slug="fornecedores-regionais"
        )
        db.session.add(novo)
        db.session.commit()
        print(f"Restaurante Regional criado com ID {novo.id}")


if __name__ == "__main__":
    main()
