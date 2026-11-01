#!/usr/bin/env bash
set -euo pipefail

mkdir -p reports
test_dir=$(mktemp -d)
api_pid=""
web_pid=""

cleanup() {
    for pid in "$web_pid" "$api_pid"; do
        if [ -n "$pid" ]; then
            kill "$pid" 2>/dev/null || true
            wait "$pid" 2>/dev/null || true
        fi
    done
    rm -rf -- "$test_dir"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# API y frontend compilado comparten origen mediante el proxy de Vite.
DATABASE_PATH="$test_dir/e2e.sqlite" APP_ORIGIN=http://localhost:5173 PORT=3000     bun server/index.js > reports/api.log 2>&1 &
api_pid=$!
bun run preview > reports/frontend.log 2>&1 &
web_pid=$!

ready=false
for ((attempt=1; attempt<=60; attempt++)); do
    if ! kill -0 "$api_pid" 2>/dev/null || ! kill -0 "$web_pid" 2>/dev/null; then
        echo "Un servicio termino antes de estar disponible."
        cat reports/api.log reports/frontend.log
        exit 1
    fi
    # Sin sesion, /api/auth/me debe responder 401, tambien a traves del proxy.
    status=$(curl -s -o /dev/null -w '%{http_code}' --max-time 2         http://localhost:5173/api/auth/me || true)
    if [ "$status" = 401 ] && curl -fsS --max-time 2 http://localhost:5173/ > /dev/null; then
        ready=true
        break
    fi
    sleep 1
done

if [ "$ready" != true ]; then
    echo "Los servicios no estuvieron disponibles dentro del plazo."
    cat reports/api.log reports/frontend.log
    exit 1
fi

bunx --no-install cypress run --browser electron     --config video=true     --reporter junit     --reporter-options 'mochaFile=reports/cypress-[hash].xml,toConsole=true'
