@echo off
cd /d "%~dp0"
echo.
echo ========================================
echo   GIT COMMIT E PUSH - Kaizen Lists
echo ========================================
echo.

git add .
echo.

git commit -m "feat: Adiciona seletor de cores + modo noturno (CORRIGIDO)

Modo Noturno:
- Dark mode completo com toggle
- Persistencia no localStorage
- Suporte a todos componentes

Seletor de Cores:
- 4 temas: Roxo, Cinza/Preto, Azul, Verde
- Botao flutuante com painel de cores
- Mudanca instantanea de gradientes
- Persistencia automatica

Fix Mudanca de Tema:
- Estilos CSS mais especificos (html.theme-*)
- Estilos inline nos componentes (Login, Register)
- useTheme() hook em todos componentes com gradiente
- Garantia de funcionamento com dupla camada (CSS + inline)

Componentes Atualizados:
- ThemeContext.tsx - Estado global de tema
- ThemeToggle.tsx - Botoes flutuantes
- Login.tsx - Gradiente dinamico
- Register.tsx - Gradiente dinamico
- index.css - CSS dos 4 temas

Scripts e Documentacao:
- limpar_cache.bat - Limpeza de cache Python
- limpar_tokens_browser.html - Limpeza de tokens
- git-commit-push.bat - Este script
- MODO_NOTURNO.md - Guia dark mode
- SELETOR_CORES_TEMA.md - Guia seletor
- FIX_MUDANCA_TEMA.md - Fix aplicado
- INSTRUCOES_LIMPAR_CACHE.md - Guia limpeza

Fixes Anteriores:
- Scroll infinito mobile (todas telas)
- Design tela de cadastro
- Cache Python e tokens JWT"

echo.
git push

echo.
echo ========================================
echo   PUSH CONCLUIDO!
echo ========================================
echo.
pause
