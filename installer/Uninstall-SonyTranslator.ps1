[CmdletBinding()]
param([switch]$NonInteractive)

$ErrorActionPreference = 'Stop'
$BaseDir = Join-Path $env:LOCALAPPDATA 'SonyTranslator'
$VencordDir = Join-Path $BaseDir 'Vencord'
$PluginDir = Join-Path $VencordDir 'src\userplugins\SonyTranslator'
$expected = [IO.Path]::GetFullPath((Join-Path $VencordDir 'src\userplugins\SonyTranslator')).TrimEnd('\')
$actual = [IO.Path]::GetFullPath($PluginDir).TrimEnd('\')
if (-not [StringComparer]::OrdinalIgnoreCase.Equals($expected, $actual) -or $actual -notmatch '[\\/]src[\\/]userplugins[\\/]SonyTranslator$') {
    throw "Refusing unsafe uninstall path: $actual"
}
if (Test-Path -LiteralPath $PluginDir) {
    Remove-Item -LiteralPath $PluginDir -Recurse -Force
    Write-Host 'SonyTranslator source files removed. Other plugins and settings were preserved.' -ForegroundColor Green
} else {
    Write-Host 'SonyTranslator is not installed in the AutoInstaller checkout.' -ForegroundColor Yellow
}
if (-not $NonInteractive) { pause }

