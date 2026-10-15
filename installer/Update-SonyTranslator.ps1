[CmdletBinding()]
param([switch]$CheckOnly, [string]$VencordPath, [switch]$NonInteractive)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
. (Join-Path $PSScriptRoot 'ReleaseUpdate.ps1')
$operationRoot = $null
try {
    # Obtain the floor from the bundled installer AND the actual installation.
    # An old downloaded ZIP may never downgrade a newer installed plugin.
    $bundled = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'Install-SonyTranslator.ps1') -Raw
    if ($bundled -notmatch "(?m)^\`$PluginVersion = '(\d+\.\d+\.\d+)'\r?$") { throw 'Cannot identify the bundled version.' }
    $current = [version]$Matches[1]
    if (-not $VencordPath) { $VencordPath = Join-Path $env:LOCALAPPDATA 'SonyTranslator/Vencord' }
    $installedIndex = Join-Path $VencordPath 'src/userplugins/SonyTranslator/index.tsx'
    if (Test-Path -LiteralPath $installedIndex -PathType Leaf) {
        $installed = Get-Content -LiteralPath $installedIndex -Raw
        if ($installed -notmatch 'SonyTranslator - Vencord userplugin v(\d+\.\d+\.\d+)') { throw 'Cannot identify the installed version safely.' }
        $installedVersion = [version]$Matches[1]
        if ($installedVersion -gt $current) { $current = $installedVersion }
    }
    Write-Host 'Checking SonyTranslator releases...'
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $release = Invoke-RestMethod -Uri 'https://api.github.com/repos/SonyDew/SonyTranslatorVencord/releases/latest' `
        -Headers @{ 'User-Agent' = 'SonyTranslator-Updater'; Accept = 'application/vnd.github+json' } -TimeoutSec 30
    $plan = Get-SonyReleasePlan $release $current
    if (-not $plan) { Write-Host 'SonyTranslator is up to date.'; exit 0 }
    Write-Host "SonyTranslator $($plan.Version) is available."
    if ($CheckOnly) { exit 0 }

    $operationRoot = Join-Path ([IO.Path]::GetTempPath()) ('SonyTranslator-update-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $operationRoot | Out-Null
    $archive = Join-Path $operationRoot 'installer.zip'
    Write-Host 'Downloading and verifying the update...'
    Invoke-WebRequest -UseBasicParsing -Uri $plan.Url -OutFile $archive -TimeoutSec 120 | Out-Null
    Assert-SonyArchive $archive $plan
    $unpacked = Join-Path $operationRoot 'unpacked'
    Expand-Archive -LiteralPath $archive -DestinationPath $unpacked
    $installerRoot = Join-Path $unpacked 'SonyTranslator-AutoInstaller'
    Assert-SonyPayloadVersion $installerRoot $plan.Version
    # Discord is still running up to here. The verified installer owns the
    # close/build/inject/rollback/restart transaction and its exit code.
    Write-Host 'Installing the verified update...'
    & powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File (Join-Path $installerRoot 'Install-SonyTranslator.ps1') `
        -UpdateOnly -NonInteractive -VencordPath $VencordPath
    if ($LASTEXITCODE -ne 0) { throw 'The update failed. Check the installer log for rollback status.' }
    Write-Host 'SonyTranslator updated successfully.'
    exit 0
} catch {
    Write-Host "Update stopped: $($_.Exception.Message)" -ForegroundColor Yellow
    exit 1
} finally {
    if ($operationRoot) {
        $actual = [IO.Path]::GetFullPath($operationRoot)
        $temporary = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\', '/')
        if ((Split-Path $actual -Parent) -eq $temporary -and
            (Split-Path $actual -Leaf) -match '^SonyTranslator-update-[a-f0-9]{32}$') {
            Remove-Item -LiteralPath $actual -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
    if (-not $NonInteractive) { [void](Read-Host 'Press Enter to close') }
}
