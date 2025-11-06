@echo off
cd /d "%~dp0backend"
set FLASK_CONFIG=development
call .venv\Scripts\activate.bat && python run.py
pause
