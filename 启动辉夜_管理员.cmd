@echo off
rem Wrapper that asks for admin rights, then runs the real launcher.
rem Place next to 启动辉夜.cmd.

net session >nul 2>&1
if errorlevel 1 (
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

call "%~dp0启动辉夜.cmd"
