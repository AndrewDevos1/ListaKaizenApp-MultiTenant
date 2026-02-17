@echo off
echo ========================================
echo Git Commit e Push - Kaizen Lists
echo ========================================
echo.

cd /d "%~dp0"

echo [1/4] Adicionando arquivos ao staging...
git add .

echo.
echo [2/4] Criando commit...
git commit -m "feat: Adiciona seletor de cores de tema (4 opcoes)

Modo Noturno Completo:
- ThemeContext com gerenciamento de dark mode
- Toggle flutuante para alternar claro/escuro
- Persistencia no localStorage
- Transicoes suaves (0.3s)

Seletor de Cores (NOVO):
- 4 cores de tema: Roxo, Cinza/Preto, Azul, Verde
- Botao flutuante adicional com icone de paleta
- Painel popup com preview das cores
- Selecao salva automaticamente
- Afeta gradientes, botoes e inputs

Componentes Atualizados:
- ThemeContext.tsx - Adicionado themeColor state
- ThemeToggle.tsx - Adicionado botao e painel de cores
- ThemeToggle.module.css - Estilos do seletor
- index.css - CSS das 4 variantes (.theme-*)

Fixes Anteriores:
- Scroll infinito no mobile (todas as telas)
- Design da tela de cadastro melhorado
- Scripts de limpeza de cache criados

Documentacao:
- SELETOR_CORES_TEMA.md - Guia do seletor de cores
- MODO_NOTURNO.md - Guia do dark mode
- INSTRUCOES_LIMPAR_CACHE.md - Guia de limpeza"

if %errorlevel% neq 0 (
    echo.
    echo [INFO] Nenhuma mudanca para commit ou commit ja existe
    echo.
) else (
    echo.
    echo [✓] Commit criado com sucesso!
    echo.
)

echo [3/4] Verificando branch atual...
git branch

echo.
echo [4/4] Fazendo push para o repositorio remoto...
git push

if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Falha ao fazer push. Verifique:
    echo - Se voce esta conectado a internet
    echo - Se tem permissao no repositorio
    echo - Se o remote esta configurado corretamente
    echo.
    echo Execute manualmente:
    echo   git remote -v
    echo   git push origin main
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo [✓] Commit e Push concluidos com sucesso!
echo ========================================
echo.
echo Arquivos enviados:
git log -1 --stat

echo.
pause
