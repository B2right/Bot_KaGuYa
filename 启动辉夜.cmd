@echo off
chcp 65001 >nul
title Bot_KaGuYa - Kaguya (DO NOT CLOSE)

cd /d "D:\Bot_KaGuYa"
set "DSH_HOME=D:\Bot_KaGuYa\runtime\dsh-home"
set "HOST_LOG=D:\Bot_KaGuYa\runtime\host.log"

echo.
echo   ============================================================
echo      Bot_KaGuYa  -  Kaguya (Touhou / NEET princess)
echo   ============================================================
echo.
echo   KEEP THIS WINDOW OPEN. Closing it = the bot stops.
echo.

netstat -ano | findstr /r /c:":8643 .*LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo   [1/2] Kaguya brain: already running on 8643
) else (
  echo   [1/2] starting Kaguya brain ...
  start "Kaguya-brain" /min cmd /c ""D:\dsh\DeepSeek Harness.exe" --expose-internals "D:\dsh\resources\app.asar\dsh\node_modules\@deepseek-ai\dsh-desktop-host\lib\cli.js" --profile kaguya --no-open --port 3080 >> "%HOST_LOG%" 2>&1"
  for /l %%i in (1,1,40) do (
    netstat -ano | findstr /r /c:":8643 .*LISTENING" >nul 2>&1
    if not errorlevel 1 goto :ready
    ping -n 2 127.0.0.1 >nul
  )
  echo   [1/2] WARNING: 8643 not up. See runtime\host.log
  goto :next
)
:ready
echo   [1/2] Kaguya brain: OK

:next
echo.
echo   [2/2] Checking QQ ...
tasklist /fi "imagename eq QQ.exe" 2>nul | findstr /i "QQ.exe" >nul
if not errorlevel 1 (
  echo.
  echo   QQ is already running.
  echo   NapCat has to launch QQ itself, so QQ must be fully closed first.
  echo.
  echo   Right-click the QQ tray icon - Quit, then run this again.
  goto :end
)

echo   [2/2] QQ is closed. Opening QQ + NapCat now.
echo.
echo   ------------------------------------------------------------
echo    A QQ window will open. Scan it with the BOT account.
echo    This step needs ADMIN rights. If QQ never appears:
echo      close this, right-click this file,
echo      choose "Run as administrator".
echo   ------------------------------------------------------------
echo.

"D:\Bot_KaGuYa\napcat\framework\napimain.exe" "D:\qq\QQ.exe" "D:\Bot_KaGuYa\napcat\framework\napiloader.dll" "D:/Bot_KaGuYa/napcat/framework/nativeLoader.cjs"

echo.
echo   QQ channel closed. (Kaguya brain keeps running in background.)

:end
echo.
echo   ------------------------------------------------------------
echo    Kaguya brain keeps running. Close its window to stop.
echo    Press any key to close THIS window.
echo   ------------------------------------------------------------
pause >nul
