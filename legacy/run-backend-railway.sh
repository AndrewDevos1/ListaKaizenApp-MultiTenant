#!/bin/bash

# Script para rodar o backend SEMPRE com Railway PostgreSQL
# Use este script quando quiser garantir conexão com produção

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║    🚂 BACKEND → RAILWAY POSTGRESQL (PRODUÇÃO)             ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Verifica e mata processo na porta 5000
echo "🔍 Verificando porta 5000..."
PORT_PID=$(lsof -ti:5000 2>/dev/null)
if [ ! -z "$PORT_PID" ]; then
    echo "⚠️  Processo encontrado na porta 5000 (PID: $PORT_PID)"
    echo "🔪 Finalizando processo..."
    kill -9 $PORT_PID 2>/dev/null
    sleep 1
    echo "✅ Processo finalizado!"
else
    echo "✅ Porta 5000 livre"
fi

cd backend

# Verifica se o venv existe
if [ ! -d ".venv" ]; then
    echo "❌ Ambiente virtual não encontrado. Execute primeiro:"
    echo "   python -m venv .venv"
    echo "   source .venv/bin/activate"
    echo "   pip install -r requirements.txt"
    exit 1
fi

# Verifica se .env existe
if [ ! -f ".env" ]; then
    echo "❌ Arquivo .env não encontrado!"
    echo ""
    echo "Para conectar ao Railway, execute:"
    echo "   cp .env.railway-local .env"
    echo "   # Edite o .env e cole a DATABASE_URL do Railway"
    echo ""
    exit 1
fi

# Verifica se DATABASE_URL está configurado
if ! grep -q "^DATABASE_URL=postgresql://" .env; then
    echo "⚠️  DATABASE_URL não configurado ou não é PostgreSQL!"
    echo ""
    echo "Edite o arquivo backend/.env e adicione:"
    echo "   DATABASE_URL=postgresql://postgres:SENHA@trolley.proxy.rlwy.net:PORTA/railway"
    echo ""
    echo "Obtenha a URL em: Railway → Postgres → Connect"
    echo ""
    exit 1
fi

# Ativa o ambiente virtual
source .venv/bin/activate

# Carrega variáveis do .env
echo "📋 Carregando variáveis do Railway..."
export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)

echo "✅ Configuração Railway carregada"
echo "🔗 Database: ${DATABASE_URL:0:40}..."
echo ""

# Verifica conexão com PostgreSQL (opcional)
echo "🔍 Testando conexão com Railway..."
python << 'EOPYTHON'
try:
    from kaizen_app import create_app
    from kaizen_app.extensions import db
    app = create_app('development')
    with app.app_context():
        # Tenta executar uma query simples
        db.session.execute(db.text('SELECT 1'))
        print('✅ Conexão com Railway PostgreSQL OK!')
except Exception as e:
    print(f'❌ Erro ao conectar: {str(e)[:100]}')
    exit(1)
EOPYTHON

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Falha ao conectar com Railway!"
    echo "Verifique se a DATABASE_URL está correta."
    exit 1
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  🚀 Iniciando Backend conectado ao Railway PostgreSQL    ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "⚠️  ATENÇÃO: Você está mexendo no banco de PRODUÇÃO!"
echo ""

# Roda o Flask
export FLASK_APP=run.py
python run.py
