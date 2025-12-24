#!/bin/bash
# Script de validação rápida - Conexão Local com Railway PostgreSQL
# Execute: ./backend/validate_railway_connection.sh

echo "🔍 Validando Conexão Local → Railway PostgreSQL"
echo "================================================"
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se está no diretório correto
if [ ! -f "run.py" ]; then
    echo -e "${RED}❌ Erro: Execute este script do diretório backend/${NC}"
    exit 1
fi

# Verificar se .env existe
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env não encontrado!${NC}"
    echo "   Crie um .env baseado em .env.railway-local"
    exit 1
fi

# Verificar se DATABASE_URL está configurada
if ! grep -q "^DATABASE_URL=postgresql://" .env; then
    echo -e "${YELLOW}⚠️  DATABASE_URL não configurada ou não é PostgreSQL!${NC}"
    echo "   Edite o .env e adicione a URL do Railway"
    exit 1
fi

echo -e "${GREEN}✓${NC} Arquivo .env encontrado"
echo -e "${GREEN}✓${NC} DATABASE_URL configurada (PostgreSQL)"
echo ""

# Verificar se venv está ativo
if [ -z "$VIRTUAL_ENV" ]; then
    echo -e "${YELLOW}⚠️  Ambiente virtual não está ativo${NC}"
    echo "   Execute: source .venv/bin/activate"
    exit 1
fi

echo -e "${GREEN}✓${NC} Ambiente virtual ativo"
echo ""

# Verificar se servidor está rodando
echo "🔌 Testando conexão com servidor local..."
if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Servidor respondendo em http://localhost:5000"
    
    # Testar health check do banco
    echo ""
    echo "🗄️  Testando conexão com banco de dados..."
    DB_RESPONSE=$(curl -s http://localhost:5000/api/health/db)
    
    if echo "$DB_RESPONSE" | grep -q "postgresql"; then
        echo -e "${GREEN}✅ SUCESSO! Conectado ao PostgreSQL do Railway${NC}"
        echo "$DB_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$DB_RESPONSE"
    else
        echo -e "${YELLOW}⚠️  Resposta inesperada do banco:${NC}"
        echo "$DB_RESPONSE"
    fi
else
    echo -e "${RED}❌ Servidor não está respondendo${NC}"
    echo "   Execute: python run.py"
    exit 1
fi

echo ""
echo "================================================"
echo -e "${GREEN}✅ Validação concluída!${NC}"
echo ""
echo "📝 Próximos passos:"
echo "   1. Teste o login: curl -X POST http://localhost:5000/api/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"admin@kaizen.com\",\"password\":\"admin123\"}'"
echo "   2. Execute os testes: pytest tests/ -v"
echo "   3. Consulte: CONECTAR_BANCO_RAILWAY.md"
