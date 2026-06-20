#!/usr/bin/env bash
# Serve R4D4RVU locally so the in-browser SDR works offline (WebUSB needs http/localhost).
# Works from a USB stick / SSD. Needs Python or Node already present.
cd "$(dirname "$0")" || exit 1
PORT=8099
if   command -v python3 >/dev/null 2>&1; then SRV=(python3 -m http.server "$PORT")
elif command -v python  >/dev/null 2>&1; then SRV=(python  -m http.server "$PORT")
elif command -v node    >/dev/null 2>&1; then SRV=(npx --yes http-server -p "$PORT")
else echo "Need Python or Node to serve locally. Install one, or use the Docker launcher (start-radar)."; exit 1; fi
echo "Serving R4D4RVU at http://localhost:$PORT/   (press Ctrl+C to stop)"
( sleep 2; (command -v xdg-open >/dev/null 2>&1 && xdg-open "http://localhost:$PORT/") || (command -v open >/dev/null 2>&1 && open "http://localhost:$PORT/") ) >/dev/null 2>&1 &
exec "${SRV[@]}"
