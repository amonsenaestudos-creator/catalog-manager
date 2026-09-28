#!/usr/bin/env bash
# Prévia local do Catalog: serve o build pronto sem nenhuma dependência.
#
# Por que existe: nesta sandbox o workspace é restaurado entre as mensagens
# (processos morrem, node_modules volta sem permissão, preview/ desaparece).
# Este script é a forma mais rápida de reconstruir tudo em um comando:
#
#   tools/preview.sh          # serve o build que já existe em dist/
#   tools/preview.sh --build  # refaz o build antes de servir
#
# O servidor é o do Python (existe sempre) e fica em primeiro plano. Para uma
# URL que não dependa desta sandbox, o CI publica o mesmo build no GitHub
# Pages (`.github/workflows/ci.yml`, job "Publicar no GitHub Pages").
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="$RAIZ/portuguese-catalog-manager-application (2)"
PORTA="${PORTA:-5173}"

cd "$APP"

if [ "${1:-}" = "--build" ]; then
  chmod +x node_modules/.bin/* 2>/dev/null || true
  # O node_modules restaurado só traz binários nativos de Windows.
  if [ ! -d node_modules/@rollup/rollup-linux-x64-gnu ]; then
    npm install --no-save --no-audit --no-fund \
      @rollup/rollup-linux-x64-gnu @esbuild/linux-x64 \
      lightningcss-linux-x64-gnu @tailwindcss/oxide-linux-x64-gnu >/dev/null
    chmod +x node_modules/.bin/* 2>/dev/null || true
  fi
  npm run build
fi

[ -f dist/index.html ] || { echo "Sem build. Rode: tools/preview.sh --build" >&2; exit 1; }

echo "Prévia em http://localhost:$PORTA (Ctrl+C para parar)"
exec python3 -m http.server "$PORTA" --bind 0.0.0.0 --directory "$APP/dist"
