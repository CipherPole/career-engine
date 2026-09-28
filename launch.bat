@echo off
setlocal
cd /d "%~dp0"

echo.
echo  ⚡ Career Engine — Validated Local Startup
echo  =========================================
echo.
echo  [1/3] Running security and hygiene audit...
call npm test
if errorlevel 1 goto :blocked

echo.
echo  [2/3] Running dependency audit...
call npm audit
if errorlevel 1 goto :blocked

echo.
echo  [3/3] Starting local server on http://localhost:8080
echo  Press Ctrl+C to stop.
echo.
start "" http://localhost:8080
python -m http.server 8080
goto :eof

:blocked
echo.
echo  [BLOCKED] Startup checks failed. Resolve issues before launching.
pause
