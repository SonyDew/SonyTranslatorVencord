@echo off
setlocal
title SonyTranslator AutoInstaller v0.9.3
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-SonyTranslator.ps1"
set "SONY_EXIT=%ERRORLEVEL%"
if not "%SONY_EXIT%"=="0" pause
exit /b %SONY_EXIT%
