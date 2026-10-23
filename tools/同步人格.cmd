@echo off
chcp 65001 >nul
title Bot_KaGuYa - sync persona
cd /d "D:\Bot_KaGuYa"
set "NODEEXE=%USERPROFILE%\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODEEXE%" set "NODEEXE=node"
"%NODEEXE%" "D:\Bot_KaGuYa\tools\sync-persona.mjs"
echo.
pause