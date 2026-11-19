#!/usr/bin/env bash
set -euo pipefail
# La misma ejecución aislada se usa en Windows y en el agente Linux.
node scripts/run-e2e.mjs "$@"
