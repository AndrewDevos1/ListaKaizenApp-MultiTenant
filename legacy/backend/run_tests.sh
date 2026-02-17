#!/bin/bash
# Script para executar testes do backend Kaizen Lists
# Uso: ./run_tests.sh [opção]

set -e  # Parar em caso de erro

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Diretório do script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Verifica se venv existe
if [ ! -d ".venv" ]; then
    echo -e "${RED}❌ Ambiente virtual não encontrado!${NC}"
    echo "Execute: python -m venv .venv && pip install -r requirements.txt"
    exit 1
fi

# Ativa ambiente virtual
echo -e "${BLUE}🔧 Ativando ambiente virtual...${NC}"
source .venv/bin/activate

# Instala pytest-cov se não estiver instalado
if ! python -c "import pytest_cov" 2>/dev/null; then
    echo -e "${YELLOW}📦 Instalando pytest-cov...${NC}"
    pip install pytest-cov
fi

# Função para mostrar ajuda
show_help() {
    echo -e "${BLUE}🧪 Script de Testes - Kaizen Lists Backend${NC}"
    echo ""
    echo "Uso: ./run_tests.sh [opção]"
    echo ""
    echo "Opções:"
    echo "  all          - Executa todos os testes (padrão)"
    echo "  models       - Executa apenas testes de modelos"
    echo "  services     - Executa apenas testes de serviços"
    echo "  routes       - Executa apenas testes de rotas"
    echo "  repos        - Executa apenas testes de repositórios"
    echo "  auth         - Executa apenas testes de autenticação"
    echo "  admin        - Executa apenas testes de admin"
    echo "  cov          - Executa com relatório de cobertura HTML"
    echo "  quick        - Executa teste rápido (para no primeiro erro)"
    echo "  verbose      - Executa com output detalhado"
    echo "  help         - Mostra esta mensagem"
    echo ""
}

# Função principal de testes
run_tests() {
    local test_path=$1
    local description=$2
    local extra_args=$3
    
    echo -e "${GREEN}▶️  ${description}${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    if pytest $test_path $extra_args; then
        echo -e "${GREEN}✅ Testes concluídos com sucesso!${NC}"
        return 0
    else
        echo -e "${RED}❌ Alguns testes falharam!${NC}"
        return 1
    fi
}

# Processa argumentos
case "${1:-all}" in
    all)
        run_tests "tests/" "Executando TODOS os testes" "-v"
        ;;
    models)
        run_tests "tests/test_models.py" "Executando testes de MODELOS" "-v"
        ;;
    services)
        run_tests "tests/test_services.py" "Executando testes de SERVIÇOS" "-v"
        ;;
    routes)
        run_tests "tests/test_routes.py" "Executando testes de ROTAS" "-v"
        ;;
    repos)
        run_tests "tests/test_repositories.py" "Executando testes de REPOSITÓRIOS" "-v"
        ;;
    auth)
        run_tests "tests/test_auth.py" "Executando testes de AUTENTICAÇÃO" "-v"
        ;;
    admin)
        run_tests "tests/test_admin_features.py" "Executando testes de ADMIN" "-v"
        ;;
    cov)
        echo -e "${GREEN}▶️  Executando testes com COBERTURA${NC}"
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        pytest tests/ --cov=kaizen_app --cov-report=html --cov-report=term-missing -v
        echo -e "${GREEN}✅ Relatório de cobertura gerado em htmlcov/index.html${NC}"
        ;;
    quick)
        run_tests "tests/" "Teste RÁPIDO (para no primeiro erro)" "-x -v"
        ;;
    verbose)
        run_tests "tests/" "Executando com output DETALHADO" "-vv -s"
        ;;
    help)
        show_help
        ;;
    *)
        echo -e "${RED}❌ Opção inválida: $1${NC}"
        show_help
        exit 1
        ;;
esac

# Resultado final
if [ $? -eq 0 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🎉 SUCESSO! Todos os testes passaram!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}⚠️  FALHA! Verifique os erros acima.${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
fi
