# Script para rodar o backend (Windows PowerShell)

Set-Location backend

# Verifica se o venv existe
if (Test-Path ".\.venv\Scripts\Activate.ps1") {
    Write-Host "Ativando ambiente virtual..." -ForegroundColor Green
    & ".\.venv\Scripts\Activate.ps1"
} else {
    Write-Host "Ambiente virtual não encontrado. Execute primeiro:" -ForegroundColor Red
    Write-Host "python -m venv .venv" -ForegroundColor Yellow
    Write-Host "pip install -r requirements.txt" -ForegroundColor Yellow
    exit
}

# Roda o Flask
Write-Host "Iniciando Backend na porta 5000..." -ForegroundColor Cyan
$env:FLASK_APP = "run.py"
flask run
