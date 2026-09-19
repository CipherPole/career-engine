@echo off
echo.
echo  ⚡ Career Engine — Local Server
echo  ================================
echo  Opening at: http://localhost:8080
echo  Press Ctrl+C to stop.
echo.
start "" http://localhost:8080
python -m http.server 8080
pause
