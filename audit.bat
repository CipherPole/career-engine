@echo off
echo Running Paranoid Security and Hygiene Audit...
node scripts/security-audit.js
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] All security and clean-code checks passed!
) else (
    echo.
    echo [BLOCKED] Security check failed. Resolve issues before pushing!
)
pause
