@echo off
REM Double-click to launch R4D4RVU from your RTL-SDR dongle (Windows).
cd /d "%~dp0"
where docker >nul 2>nul || (echo Docker Desktop is not installed. Get it from docker.com & pause & exit /b 1)
if not exist .env copy .env.example .env >nul
echo Starting R4D4RVU + readsb (first run downloads the decoder)...
docker compose up -d || (echo Could not start - is Docker Desktop running? & pause & exit /b 1)
timeout /t 4 /nobreak >nul
start "" "http://localhost:8078/"
echo Open at http://localhost:8078/  - set your location in the gear menu once.
