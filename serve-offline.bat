@echo off
REM Serve R4D4RVU locally so the in-browser SDR works offline (WebUSB needs http/localhost).
cd /d "%~dp0"
set PORT=8099
where python >nul 2>nul && ( start "" "http://localhost:%PORT%/" & python -m http.server %PORT% & goto :eof )
where node >nul 2>nul && ( start "" "http://localhost:%PORT%/" & npx --yes http-server -p %PORT% & goto :eof )
echo Need Python or Node to serve locally. Install one, or use start-radar.bat (Docker).
pause
