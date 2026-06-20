#!/bin/bash
# Double-click to launch R4D4RVU from your RTL-SDR dongle (macOS).
cd "$(dirname "$0")" || exit 1
command -v docker >/dev/null 2>&1 || { osascript -e 'display dialog "Docker is not installed. Install Docker Desktop from docker.com, then double-click this again." buttons {"OK"}'; exit 1; }
[ -f .env ] || cp .env.example .env
echo "Starting R4D4RVU + readsb (first run downloads the decoder)…"
docker compose up -d || { osascript -e 'display dialog "Could not start. Is Docker Desktop running?" buttons {"OK"}'; exit 1; }
sleep 4
open "http://localhost:8078/"
echo "Open at http://localhost:8078/  — set your location in the gear menu once."
