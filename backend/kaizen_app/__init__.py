from flask import Flask, request, jsonify
from .config import config_by_name
from .extensions import db, migrate, jwt, cors


def create_app(config_name='production'):
    """Application Factory Function"""
    app = Flask(__name__)

    # Carrega as configurações
    app.config.from_object(config_by_name[config_name])

    # Inicializa as extensões
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    # Configuração CORS - Dinâmica (Dev vs Prod)
    if config_name == 'development':
        # DEV: CORS aberto para qualquer origem
        # Resolve problema de IP mudando quando muda de rede
        cors.init_app(app, resources={r"/api/*": {"origins": "*"}})
    else:
        # PROD: CORS restrito apenas ao domínio Vercel (segurança)
        cors.init_app(app,
            resources={r"/api/*": {
                "origins": ["https://lista-kaizen-app.vercel.app"],
                "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"],
                "supports_credentials": True
            }}
        )

    # Middleware para log de todas as requisições
    @app.before_request
    def log_request_info():
        print("\n" + "=" * 30)
        print(f"[FLASK] Nova requisicao recebida!")
        print(f"[FLASK] Metodo: {request.method}")
        print(f"[FLASK] URL: {request.url}")
        print(f"[FLASK] Path: {request.path}")
        print(f"[FLASK] Endpoint: {request.endpoint}")
        print(f"[FLASK] View Args: {request.view_args}")
        print(f"[FLASK] Headers:")
        for header, value in request.headers:
            if header.lower() != 'authorization':
                print(f"         {header}: {value}")
            else:
                has_auth = 'Bearer' in value
                print(f"         {header}: Bearer ... (presente: {has_auth})")

        if request.method in ['POST', 'PUT', 'PATCH']:
            try:
                print(f"[FLASK] Content-Type: {request.content_type}")
                print(f"[FLASK] Content-Length: {request.content_length}")

                data = request.get_json(force=True, silent=False)
                if data:
                    print(f"[FLASK] Body (JSON) PARSED: {data}")
                    print(f"[FLASK] Tipo do body: {type(data)}")
                else:
                    print(f"[FLASK] Body: {request.data.decode('utf-8') if request.data else 'vazio'}")
            except Exception as e:
                print(f"[ERRO] [FLASK] ERRO ao ler body: {type(e).__name__}: {e}")
                import traceback
                traceback.print_exc()
        print("=" * 30 + "\n")

    @app.after_request
    def log_response_info(response):
        print("\n" + "=" * 30)
        print(f"[FLASK] Resposta sendo enviada")
        print(f"[FLASK] Status: {response.status}")
        print(f"[FLASK] Path: {request.path}")

        if response.status_code >= 400:
            try:
                data = response.get_json()
                print(f"[FLASK] Corpo da resposta de erro: {data}")
            except:
                print(f"[FLASK] Corpo da resposta (texto): {response.get_data(as_text=True)[:200]}")

        print("=" * 30 + "\n")
        return response

    # ROTAS DE HEALTH CHECK
    @app.route("/", methods=["GET"])
    def health_check():
        """Health check da API - Rota raiz"""
        return jsonify({
            "status": "ok",
            "message": "Kaizen Lists API está rodando!",
            "version": "1.0.0"
        }), 200

    @app.route("/api/v1/health", methods=["GET"])
    def api_health():
        """Health check da API em /api/v1/health"""
        return jsonify({
            "status": "ok",
            "database": "connected",
            "message": "API pronta!"
        }), 200

    # Handler para erros 422
    @app.errorhandler(422)
    def handle_unprocessable_entity(e):
        print(f"\n[ERRO 422 CAPTURADO]")
        print(f"Erro: {e}")
        print(f"Tipo: {type(e)}")
        print(f"Descricao: {e.description if hasattr(e, 'description') else 'N/A'}")

        if hasattr(e, 'data'):
            print(f"Data: {e.data}")
        if hasattr(e, 'exc'):
            print(f"Exception: {e.exc}")

        import traceback
        traceback.print_exc()
        print("=" * 50 + "\n")

        return jsonify({
            "error": "Dados inválidos",
            "message": str(e.description if hasattr(e, 'description') else e),
            "details": "Verifique os campos enviados"
        }), 422

    # Handler para exceções gerais
    @app.errorhandler(Exception)
    def handle_exception(e):
        print(f"\n[EXCECAO NAO TRATADA]")
        print(f"Tipo: {type(e).__name__}")
        print(f"Mensagem: {str(e)}")

        import traceback
        traceback.print_exc()
        print("=" * 50 + "\n")

        if hasattr(e, 'code'):
            return jsonify({
                "error": "Erro do servidor",
                "message": str(e),
                "type": type(e).__name__
            }), e.code

        return jsonify({
            "error": "Erro interno do servidor",
            "message": str(e),
            "type": type(e).__name__
        }), 500

    with app.app_context():
        # Importa e registra os Blueprints
        from .controllers import auth_bp, admin_bp, api_bp, collaborator_bp
        app.register_blueprint(auth_bp)
        app.register_blueprint(admin_bp)
        app.register_blueprint(api_bp)
        app.register_blueprint(collaborator_bp)

        # Cria as tabelas do banco
        db.create_all()

        return app
