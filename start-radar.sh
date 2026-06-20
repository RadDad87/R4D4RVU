#!/usr/bin/env bash
# Run R4D4RVU from your RTL-SDR dongle (Linux).
cd "$(dirname "$0")" || exit 1
command -v docker >/dev/null 2>&1 || { echo "Docker is not installed: https://docs.docker.com/engine/install/"; exit 1; }
[ -f .env ] || cp .env.example .env
echo "Starting R4D4RVU + readsb (first run downloads the decoder)…"
docker compose up -d || { echo "Could not start — is the Docker daemon running?"; exit 1; }
sleep 4
( xdg-open "http://localhost:8078/" >/dev/null 2>&1 || sensible-browser "http://localhost:8078/" >/dev/null 2>&1 ) &
echo "R4D4RVU is running at http://localhost:8078/  — set your location in the gear menu once."
