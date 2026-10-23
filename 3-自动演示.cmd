@echo off
chcp 65001 >nul
title [3] Bot_KaGuYa - automatic demo (no typing needed)
cd /d "D:\Bot_KaGuYa"

set "NODEEXE=%USERPROFILE%\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODEEXE%" set "NODEEXE=C:\Program Files\nodejs\node.exe"
if not exist "%NODEEXE%" set "NODEEXE=node"

"%NODEEXE%" "D:\Bot_KaGuYa\tools\chat-cli.mjs" "在吗，出来打游戏" "辉夜，你又在打游戏吗" "来张辉夜图" "永琳叫你少熬夜"
echo.
pause
