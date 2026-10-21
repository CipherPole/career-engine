@echo off
setlocal
cd /d "%~dp0"

rem Career Engine guided release. Usage:
rem   release.bat start feature/my-change
rem   release.bat ship "feat: what changed"
rem   release.bat prod
rem   release.bat status

node scripts\release.js %*
if errorlevel 1 pause
