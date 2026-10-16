[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$InstallerZip,
    [string]$ExpectedVersion,
    [string]$PreviousVersion = '0.9.1'
)

$ErrorActionPreference = 'Stop'
if (-not $ExpectedVersion) {
    $ExpectedVersion = (Get-Content -LiteralPath (Join-Path (Split-Path $PSScriptRoot -Parent) 'package.json') -Raw | ConvertFrom-Json).version
}
$TempRoot = Join-Path ([IO.Path]::GetTempPath()) ("sonytranslator-installer-test-" + [guid]::NewGuid().ToString('N'))
$Extracted = Join-Path $TempRoot 'unpacked'
$FakeLocal = Join-Path $TempRoot 'localappdata'
$FakeVencord = Join-Path $TempRoot 'fake-vencord'
New-Item -ItemType Directory -Force -Path $Extracted, $FakeLocal, (Join-Path $FakeVencord 'src\userplugins') | Out-Null
Expand-Archive -LiteralPath $InstallerZip -DestinationPath $Extracted
$Installer = Join-Path $Extracted 'SonyTranslator-AutoInstaller\Install-SonyTranslator.ps1'
if (-not (Test-Path -LiteralPath $Installer)) { throw 'Installer entry point is missing from release ZIP.' }
$installerSource = Get-Content -LiteralPath $Installer -Raw
if ($installerSource -notmatch 'Start-DiscordAfterOperation' -or $installerSource -notmatch 'PreviouslyRunningDiscordClient') {
    throw 'Installer does not contain the guarded Discord auto-launch flow.'
}
'{"name":"fake-vencord","packageManager":"pnpm@11.9.0"}' | Set-Content -LiteralPath (Join-Path $FakeVencord 'package.json') -Encoding utf8
$oldLocal = $env:LOCALAPPDATA
$env:LOCALAPPDATA = $FakeLocal
. (Join-Path $PSScriptRoot 'installer-fixtures.ps1')
foreach ($client in @('Stable', 'Canary', 'PTB')) { [void](New-TestDiscord $FakeLocal $client '') }

function Invoke-Isolated(
    [string]$Mode,
    [string]$RunningClient = 'None',
    [string]$LaunchLog,
    [switch]$LaunchFailure,
    [switch]$Updating
) {
    $arguments = @(
        '-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $Installer,
        '-VencordPath', $FakeVencord, '-NonInteractive', '-SkipInject',
        '-BuildMode', $Mode, '-TestRunningDiscordClient', $RunningClient
    )
    $selected = if ($RunningClient -eq 'None') { 'Stable' } else { $RunningClient }
    $arguments += @('-DiscordClient', $selected)
    if ($Updating) { $arguments += '-UpdateOnly' }
    if ($LaunchLog) { $arguments += @('-TestDiscordLaunchLog', $LaunchLog) }
    if ($LaunchFailure) { $arguments += '-TestDiscordLaunchFailure' }
    $output = @(& powershell.exe @arguments 2>&1 | ForEach-Object { $_.ToString() })
    $exitCode = $LASTEXITCODE
    $output | ForEach-Object { Write-Host $_ }
    return [pscustomobject]@{ ExitCode = $exitCode; Output = ($output -join "`n") }
}

try {
    if ((Invoke-Isolated 'Skip').ExitCode -ne 0) { throw 'Fresh-install simulation failed.' }
    foreach ($client in @('Stable', 'Canary', 'PTB')) { [void](New-TestDiscord $FakeLocal $client (Join-Path $FakeVencord 'dist/patcher.js')) }
    $Plugin = Join-Path $FakeVencord 'src\userplugins\SonyTranslator'
    if ((Get-Content -LiteralPath (Join-Path $Plugin 'index.tsx') -Raw) -notmatch [regex]::Escape("v$ExpectedVersion")) { throw 'Fresh install payload/version mismatch.' }

    $indexPath = Join-Path $Plugin 'index.tsx'
    (Get-Content -LiteralPath $indexPath -Raw).Replace("v$ExpectedVersion", "v$PreviousVersion") |
        Set-Content -LiteralPath $indexPath -Encoding utf8
    Set-Content -LiteralPath (Join-Path $Plugin 'rollback-marker.txt') -Value 'previous-version-must-survive' -Encoding utf8
    if ((Invoke-Isolated 'Skip' -Updating).ExitCode -ne 0) { throw 'Update simulation failed.' }
    if (Test-Path -LiteralPath (Join-Path $Plugin 'rollback-marker.txt')) { throw 'Successful update did not replace the old payload.' }
    if ((Get-Content -LiteralPath $indexPath -Raw) -notmatch [regex]::Escape("v$ExpectedVersion")) { throw "v$PreviousVersion update did not install the current payload." }

    # Surviving source/settings cannot turn a removed Vencord into a valid update.
    $before = (Get-FileHash -LiteralPath $indexPath).Hash
    $resources = New-TestDiscord $FakeLocal 'Stable' ''
    $missingLaunchLog = Join-Path $TempRoot 'missing-vencord-launch.log'
    $missingResult = Invoke-Isolated 'Skip' 'Stable' $missingLaunchLog -Updating
    if ($missingResult.ExitCode -eq 0 -or $missingResult.Output -match 'Closing simulated Discord|installed successfully' -or
        (Test-Path -LiteralPath $missingLaunchLog) -or (Get-FileHash -LiteralPath $indexPath).Hash -ne $before) {
        throw 'Removed Vencord update changed state or reported success.'
    }
    [void](New-TestDiscord $FakeLocal 'Stable' (Join-Path $FakeVencord 'dist/patcher.js'))

    Set-Content -LiteralPath (Join-Path $Plugin 'rollback-marker.txt') -Value 'previous-version-must-survive' -Encoding utf8
    $failedResult = Invoke-Isolated 'Fail'
    if ($failedResult.ExitCode -eq 0) { throw 'Simulated build failure unexpectedly succeeded.' }
    if ((Get-Content -LiteralPath (Join-Path $Plugin 'rollback-marker.txt') -Raw).Trim() -ne 'previous-version-must-survive') {
        throw 'Rollback did not restore the previous plugin directory.'
    }
    foreach ($client in @('Stable', 'Canary', 'PTB')) {
        $launchLog = Join-Path $TempRoot "launch-$client.log"
        $result = Invoke-Isolated 'Skip' $client $launchLog
        if ($result.ExitCode -ne 0) { throw "$client restart simulation failed." }
        $launches = @(Get-Content -LiteralPath $launchLog)
        if (($launches | Where-Object { $_ -eq "STARTED $client" }).Count -ne 1) {
            throw "$client was not restarted exactly once."
        }
        if (($launches | Where-Object { $_ -match '^STARTED ' -and $_ -ne "STARTED $client" }).Count) {
            throw "A client other than $client was restarted."
        }
        $attemptIndex = $result.Output.IndexOf("Restarting Discord $client")
        $successIndex = $result.Output.IndexOf("SonyTranslator $ExpectedVersion installed successfully")
        if ($attemptIndex -lt 0 -or $successIndex -lt 0 -or $attemptIndex -gt $successIndex) {
            throw 'Installer reported success before the Discord restart attempt.'
        }
    }

    $noClientLog = Join-Path $TempRoot 'launch-no-client.log'
    $noClientResult = Invoke-Isolated 'Skip' 'None' $noClientLog
    if ($noClientResult.ExitCode -ne 0) { throw 'No-running-client installation simulation failed.' }
    if (Test-Path -LiteralPath $noClientLog) { throw 'Installer guessed and launched a Discord client when none was running.' }

    $rollbackLaunchLog = Join-Path $TempRoot 'launch-rollback.log'
    $rollbackResult = Invoke-Isolated 'Fail' 'Canary' $rollbackLaunchLog
    if ($rollbackResult.ExitCode -eq 0) { throw 'Failed-build restart simulation unexpectedly succeeded.' }
    if ($rollbackResult.Output.IndexOf('Previous SonyTranslator files restored.') -gt $rollbackResult.Output.IndexOf('Restarting Discord Canary after rollback')) {
        throw 'Discord restarted before rollback completed.'
    }
    if ((Get-Content -LiteralPath $rollbackLaunchLog) -notcontains 'STARTED Canary') {
        throw 'Previously running Canary was not restarted after rollback.'
    }

    $restartFailureLog = Join-Path $TempRoot 'launch-failure.log'
    $restartFailure = Invoke-Isolated 'Skip' 'PTB' $restartFailureLog -LaunchFailure
    if ($restartFailure.ExitCode -ne 0) { throw 'Discord restart failure incorrectly rolled back a successful plugin installation.' }
    if ($restartFailure.Output -notmatch '\[WARN\].*could not be restarted') {
        throw 'Discord restart failure was not reported as a warning.'
    }
    if ($restartFailure.Output -notmatch [regex]::Escape("SonyTranslator $ExpectedVersion installed successfully")) {
        throw 'Plugin installation success was not preserved after Discord restart failure.'
    }

    Write-Host 'PASS: fresh install, update, rollback, exact-client restart, ordering, and launch-failure isolation.' -ForegroundColor Green
} finally {
    $env:LOCALAPPDATA = $oldLocal
}
