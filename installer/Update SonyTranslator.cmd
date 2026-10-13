@echo off
setlocal
title Update SonyTranslator v0.9.4
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-SonyTranslator.ps1" -UpdateOnly
set "SONY_EXIT=%ERRORLEVEL%"
if not "%SONY_EXIT%"=="0" pause
exit /b %SONY_EXIT%
