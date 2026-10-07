#!/usr/bin/env bash
# Verificación completa: sintaxis del JS real dentro de index.html + pruebas de comportamiento.
set -e
cd "$(dirname "$0")/.."
python3 - <<'PY'
c=open('index.html').read()
a=c.index('<script>'); b=c.index('</script>', a)
s=c[a+len('<script>'):b]
assert len(s.splitlines())>500, 'extracción sospechosa: el bloque de script salió casi vacío'
open('/tmp/entreno-app.js','w').write(s)
PY
node --check /tmp/entreno-app.js && echo "Sintaxis OK ($(wc -l < /tmp/entreno-app.js) líneas)"
python3 -m http.server 8765 >/dev/null 2>&1 & SRV=$!
trap "kill $SRV" EXIT
sleep 1
node tests/intermediario.test.mjs
NODE_PATH="${NODE_PATH:-$(npm root -g)}" node tests/app.test.js
