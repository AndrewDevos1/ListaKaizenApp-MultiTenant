import os
import sys

from sqlalchemy import inspect


def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    if base_dir not in sys.path:
        sys.path.insert(0, base_dir)

    from kaizen_app import create_app
    from kaizen_app.extensions import db

    app = create_app(os.getenv("FLASK_CONFIG") or "default")
    with app.app_context():
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        if "fornecedores" not in tables:
            print("ERROR: table fornecedores not found")
            raise SystemExit(2)

        columns = [col["name"] for col in inspector.get_columns("fornecedores")]
        print("columns:", ", ".join(sorted(columns)))

        required = ["responsavel", "observacao"]
        missing = [col for col in required if col not in columns]
        if missing:
            print("MISSING:", ", ".join(missing))
            raise SystemExit(1)

        print("OK: fornecedores has responsavel/observacao")


if __name__ == "__main__":
    main()
