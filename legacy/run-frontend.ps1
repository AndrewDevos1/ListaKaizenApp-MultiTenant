# Script para rodar o frontend (Windows PowerShell)

Set-Location frontend

# Verifica se node_modules existe
if (-Not (Test-Path "node_modules")) {
    Write-Host "Instalando dependências do frontend..." -ForegroundColor Green
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Erro ao instalar dependências!" -ForegroundColor Red
        exit
    }
}

# Roda o frontend
Write-Host "Iniciando Frontend na porta 3000..." -ForegroundColor Cyan
npm start
