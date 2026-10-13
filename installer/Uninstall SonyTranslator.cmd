@echo off
setlocal
title Uninstall SonyTranslator
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Uninstall-SonyTranslator.ps1"
set "SONY_EXIT=%ERRORLEVEL%"
if not "%SONY_EXIT%"=="0" pause
exit /b %SONY_EXIT%
