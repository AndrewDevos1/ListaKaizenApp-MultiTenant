#!/bin/bash
set -e

echo "=== Validando build do React ==="

# 1. Verificar se build/ existe
if [ ! -d "build" ]; then
  echo "❌ ERROR: Diretório build/ não existe"
  exit 1
fi
echo "✓ Diretório build/ existe"

# 2. Verificar index.html existe
if [ ! -f "build/index.html" ]; then
  echo "❌ ERROR: build/index.html não encontrado"
  echo "Conteúdo de build/:"
  ls -la build/
  exit 1
fi
echo "✓ Arquivo index.html existe"

# 3. Verificar tamanho do index.html (deve ter >1KB)
SIZE=$(wc -c < build/index.html)
if [ "$SIZE" -lt 1000 ]; then
  echo "❌ ERROR: index.html muito pequeno ($SIZE bytes)"
  echo "Conteúdo de index.html:"
  cat build/index.html
  exit 1
fi
echo "✓ index.html tem tamanho adequado ($SIZE bytes)"

# 4. Verificar presença de scripts
if ! grep -q "static/js/main" build/index.html; then
  echo "❌ ERROR: index.html não referencia bundle JS"
  echo "Scripts encontrados:"
  grep "script" build/index.html || true
  exit 1
fi
echo "✓ index.html referencia bundles JS"

# 5. Verificar diretório static/ existe
if [ ! -d "build/static" ]; then
  echo "❌ ERROR: build/static/ não existe"
  ls -la build/
  exit 1
fi
echo "✓ Diretório static/ existe"

# 6. Verificar pelo menos 1 arquivo .js foi gerado
JS_COUNT=$(find build/static/js -name "*.js" 2>/dev/null | wc -l)
if [ "$JS_COUNT" -eq 0 ]; then
  echo "❌ ERROR: Nenhum arquivo .js em static/js"
  ls -la build/static/ || true
  exit 1
fi
echo "✓ Encontrados $JS_COUNT arquivos JS"

# 7. Verificar pelo menos 1 arquivo .css foi gerado
CSS_COUNT=$(find build/static/css -name "*.css" 2>/dev/null | wc -l)
if [ "$CSS_COUNT" -eq 0 ]; then
  echo "⚠️  WARNING: Nenhum arquivo .css em static/css (pode estar em JS)"
fi
echo "✓ Encontrados $CSS_COUNT arquivos CSS"

echo ""
echo "✅ BUILD VALIDADO COM SUCESSO!"
echo "   - Total de arquivos JS: $JS_COUNT"
echo "   - Total de arquivos CSS: $CSS_COUNT"
echo "   - Tamanho de index.html: $SIZE bytes"
exit 0
