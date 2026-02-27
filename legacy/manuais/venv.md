# Cria o venv (se já criado, pule)
python -m venv .venv

# Confirme os arquivos de ativação
dir .\.venv\Scripts\

# Ativa no PowerShell (observe o "dot + espaço")
. .\.venv\Scripts\Activate.ps1
# OU alternativamente
& .\.venv\Scripts\Activate.ps1

# Ao ativar com sucesso o prompt mostrará (.venv) no início.
# Verifique:
python --version
where.exe python

# Dentro do venv, atualize pip e instale os pacotes
python -m pip install --upgrade pip
pip install llm llm-gemini