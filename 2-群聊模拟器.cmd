@echo off
chcp 65001 >nul
title [2] Bot_KaGuYa - group chat simulator
cd /d "D:\Bot_KaGuYa"

set "NODEEXE=%USERPROFILE%\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODEEXE%" set "NODEEXE=C:\Program Files\nodejs\node.exe"
if not exist "%NODEEXE%" set "NODEEXE=node"

"%NODEEXE%" "D:\Bot_KaGuYa\tools\chat-cli.mjs" %*
echo.
pause
