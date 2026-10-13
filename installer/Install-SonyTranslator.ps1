[CmdletBinding()]
param(
    [switch]$UpdateOnly,
    [string]$VencordPath,
    [switch]$NonInteractive,
    [switch]$SkipInject,
    [switch]$SkipDiscordLaunch,
    [ValidateSet('Auto', 'None', 'Stable', 'Canary', 'PTB')]
    [string]$TestRunningDiscordClient = 'Auto',
    [string]$TestDiscordLaunchLog,
    [switch]$TestDiscordLaunchFailure,
    [ValidateSet('Normal', 'Skip', 'Fail')]
    [string]$BuildMode = 'Normal'
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$ProductName = 'SonyTranslator'
$PluginVersion = '0.9.5'
$RepoUrl = 'https://github.com/Vendicated/Vencord.git'
$BaseDir = Join-Path $env:LOCALAPPDATA 'SonyTranslator'
$DefaultVencordDir = Join-Path $BaseDir 'Vencord'
$LogPath = Join-Path $BaseDir 'installer.log'
$PayloadDir = Join-Path $PSScriptRoot 'payload\SonyTranslator'
$script:BackupDir = $null
$script:PluginDir = $null
$script:VencordDir = $null
$script:HadPreviousPlugin = $false
$script:PayloadInstalled = $false
$script:PreviouslyRunningDiscordClient = $null
$script:DiscordWasStopped = $false

$DiscordClients = @(
    @{ Id = 'Stable'; Process = 'Discord'; Root = 'Discord'; Exe = 'Discord.exe' },
    @{ Id = 'Canary'; Process = 'DiscordCanary'; Root = 'DiscordCanary'; Exe = 'DiscordCanary.exe' },
    @{ Id = 'PTB'; Process = 'DiscordPTB'; Root = 'DiscordPTB'; Exe = 'DiscordPTB.exe' }
)

function Write-Step([string]$Text) { Write-Host "`n==> $Text" -ForegroundColor Cyan }
function Write-Good([string]$Text) { Write-Host "[OK] $Text" -ForegroundColor Green }
function Write-Warn([string]$Text) { Write-Host "[WARN] $Text" -ForegroundColor Yellow }

function Invoke-InstallerCommand([string]$File, [string[]]$Arguments) {
    # Windows PowerShell treats native stderr progress as an ErrorRecord.
    # The process exit code, rather than progress output, determines failure.
    $ErrorActionPreference = 'Continue'
    # Start-Transcript holds its own file open in Windows PowerShell 5.1.
    # Native commands therefore use a separate detail log.
    & $File @Arguments *>> "$LogPath.commands.log"
    if ($LASTEXITCODE -ne 0) { throw "A required installation step failed. See installer.log for details. ($File exit $LASTEXITCODE)" }
}

function Get-DiscordClient([string]$Id) {
    return $DiscordClients | Where-Object { $_.Id -eq $Id } | Select-Object -First 1
}

function Get-RunningDiscordClient {
    if ($TestRunningDiscordClient -ne 'Auto') {
        if ($TestRunningDiscordClient -eq 'None') { return $null }
        return $TestRunningDiscordClient
    }
    if ($BuildMode -ne 'Normal') { return $null }

    $candidates = foreach ($client in $DiscordClients) {
        foreach ($process in @(Get-Process -Name $client.Process -ErrorAction SilentlyContinue)) {
            $started = try { $process.StartTime } catch { [DateTime]::MinValue }
            [pscustomobject]@{
                Client = $client.Id
                Visible = $process.MainWindowHandle -ne 0
                StartTime = $started
            }
        }
    }
    if (-not $candidates) { return $null }

    $types = @($candidates | Select-Object -ExpandProperty Client -Unique)
    $selected = $candidates |
        Sort-Object @{ Expression = 'Visible'; Descending = $true }, @{ Expression = 'StartTime'; Descending = $true } |
        Select-Object -First 1
    if ($types.Count -gt 1) {
        Write-Warn "Multiple Discord client types are running; only $($selected.Client) will be restarted."
    }
    return $selected.Client
}

function Stop-RunningDiscordClients {
    if (-not $script:PreviouslyRunningDiscordClient -or $SkipDiscordLaunch) { return }
    if ($TestRunningDiscordClient -ne 'Auto') {
        Write-Step "Closing simulated Discord $($script:PreviouslyRunningDiscordClient) client"
        $script:DiscordWasStopped = $true
        return
    }

    Write-Step "Closing Discord before Vencord build/injection (will restart $($script:PreviouslyRunningDiscordClient))"
    $running = @($DiscordClients | ForEach-Object { Get-Process -Name $_.Process -ErrorAction SilentlyContinue })
    if ($running.Count) { $running | Stop-Process -Force -ErrorAction Stop }
    $deadline = [DateTime]::UtcNow.AddSeconds(10)
    do {
        $remaining = @($DiscordClients | ForEach-Object { Get-Process -Name $_.Process -ErrorAction SilentlyContinue })
        if (-not $remaining.Count) { break }
        Start-Sleep -Milliseconds 200
    } while ([DateTime]::UtcNow -lt $deadline)
    if ($remaining.Count) { throw 'Discord did not close within 10 seconds.' }
    $script:DiscordWasStopped = $true
    Write-Good 'Discord closed.'
}

function Get-FullPath([string]$Path) {
    return [IO.Path]::GetFullPath($Path).TrimEnd([IO.Path]::DirectorySeparatorChar)
}

function Assert-SafePluginPath([string]$Candidate, [string]$Root) {
    $expected = Get-FullPath (Join-Path $Root 'src\userplugins\SonyTranslator')
    $actual = Get-FullPath $Candidate
    if (-not [StringComparer]::OrdinalIgnoreCase.Equals($expected, $actual)) {
        throw "Refusing unsafe plugin path: $actual"
    }
    if ($actual.Length -lt 20 -or $actual -notmatch '[\\/]src[\\/]userplugins[\\/]SonyTranslator$') {
        throw "Plugin path failed safety validation: $actual"
    }
}

function Refresh-Path {
    $machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $extraPath = @("$env:ProgramFiles\nodejs", "$env:ProgramFiles\Git\cmd", "$env:LOCALAPPDATA\Programs\Git\cmd") -join ';'
    $env:Path = "$machinePath;$userPath;$extraPath"
}

function Require-Command([string]$Name, [string]$WingetId) {
    if (Get-Command $Name -ErrorAction SilentlyContinue) { return }
    if ($BuildMode -ne 'Normal') { throw "$Name is missing in isolated installer validation mode." }
    if (-not (Get-Command winget.exe -ErrorAction SilentlyContinue)) {
        throw "$Name is missing and winget is unavailable. Install $Name, then run the installer again."
    }
    Write-Step "Installing prerequisite: $Name"
    Invoke-InstallerCommand 'winget.exe' @('install', '--id', $WingetId, '-e', '--source', 'winget', '--accept-source-agreements', '--accept-package-agreements', '--silent')
    Refresh-Path
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name was installed but is not visible yet. Reopen the installer once."
    }
}

function Get-NodeMajor {
    $version = (& node.exe -p "process.versions.node").Trim()
    return [int]($version.Split('.')[0])
}

function Install-Prerequisites {
    Refresh-Path
    Require-Command 'git.exe' 'Git.Git'
    if (-not (Get-Command node.exe -ErrorAction SilentlyContinue) -or (Get-NodeMajor) -lt 22) {
        if ($BuildMode -ne 'Normal' -or -not (Get-Command winget.exe -ErrorAction SilentlyContinue)) {
            throw 'Node.js 22+ is required. Install current Node.js LTS and run the installer again.'
        }
        Write-Step 'Installing/upgrading Node.js LTS'
        Invoke-InstallerCommand 'winget.exe' @('install', '--id', 'OpenJS.NodeJS.LTS', '-e', '--source', 'winget', '--accept-source-agreements', '--accept-package-agreements', '--silent', '--force')
        Refresh-Path
    }
    if (-not (Get-Command node.exe -ErrorAction SilentlyContinue) -or (Get-NodeMajor) -lt 22) {
        throw 'Node.js 22+ is still unavailable.'
    }
    Require-Command 'npx.cmd' 'OpenJS.NodeJS.LTS'
    Write-Good 'Required tools are ready.'
}

function Get-InstalledPluginVersion([string]$Directory) {
    $indexPath = Join-Path $Directory 'index.tsx'
    if (-not (Test-Path -LiteralPath $indexPath -PathType Leaf)) { return $null }
    $match = [regex]::Match((Get-Content -LiteralPath $indexPath -Raw), 'userplugin v(?<version>\d+\.\d+\.\d+)')
    if ($match.Success) { return $match.Groups['version'].Value }
    return 'unknown'
}

function Select-VencordDirectory {
    if ($VencordPath) { return Get-FullPath $VencordPath }
    if (Test-Path -LiteralPath (Join-Path $DefaultVencordDir 'package.json')) { return Get-FullPath $DefaultVencordDir }
    return Get-FullPath $DefaultVencordDir
}

function Prepare-VencordSource([string]$Directory) {
    if (Test-Path -LiteralPath (Join-Path $Directory 'package.json')) {
        if (Test-Path -LiteralPath (Join-Path $Directory '.git')) {
            Write-Step 'Updating Vencord'
            # Fetching depth 1 on every update disconnects the old shallow tip from
            # origin/main. Restore ancestry before attempting a safe fast-forward.
            $shallow = (& git.exe -C $Directory rev-parse --is-shallow-repository).Trim()
            if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect the Vencord Git checkout.' }
            if ($shallow -eq 'true') {
                Invoke-InstallerCommand 'git.exe' @('-C', $Directory, 'fetch', '--unshallow', 'origin', '+refs/heads/main:refs/remotes/origin/main')
            } else {
                Invoke-InstallerCommand 'git.exe' @('-C', $Directory, 'fetch', 'origin', '+refs/heads/main:refs/remotes/origin/main')
            }
            try { Invoke-InstallerCommand 'git.exe' @('-C', $Directory, 'merge', '--ff-only', 'origin/main') } catch {
                throw 'Vencord could not fast-forward to origin/main. Local changes were preserved; installation stopped before building stale code.'
            }
        }
        return
    }

    if ($UpdateOnly) { Write-Warn 'No previous private checkout found; performing a full install.' }
    if (Test-Path -LiteralPath $Directory) {
        $items = @(Get-ChildItem -LiteralPath $Directory -Force -ErrorAction SilentlyContinue)
        if ($items.Count) { throw "The selected Vencord folder is not a valid checkout and is not empty: $Directory" }
    }
    New-Item -ItemType Directory -Force -Path (Split-Path $Directory -Parent) | Out-Null
    Write-Step 'Downloading Vencord'
    Invoke-InstallerCommand 'git.exe' @('clone', '--depth', '1', '--branch', 'main', $RepoUrl, $Directory)
}

function Invoke-VencordBuild([string]$Directory) {
    if ($BuildMode -eq 'Fail') { throw 'Simulated build failure for rollback validation.' }
    if ($BuildMode -eq 'Skip') {
        Write-Warn 'Build skipped by isolated validation mode.'
        return
    }
    $packageJson = Get-Content -LiteralPath (Join-Path $Directory 'package.json') -Raw | ConvertFrom-Json
    $pnpmSpec = if ($packageJson.packageManager -and $packageJson.packageManager -match '^pnpm@') { [string]$packageJson.packageManager } else { 'pnpm@11.9.0' }
    Push-Location $Directory
    try {
        Write-Step 'Preparing build tools'
        Invoke-InstallerCommand 'npx.cmd' @('--yes', $pnpmSpec, 'install', '--frozen-lockfile')
        Write-Step 'Checking compatibility'
        Invoke-InstallerCommand 'npx.cmd' @('--yes', $pnpmSpec, 'testTsc')
        Write-Step 'Building Vencord and SonyTranslator'
        Invoke-InstallerCommand 'npx.cmd' @('--yes', $pnpmSpec, 'build')
    } finally { Pop-Location }
}

function Install-Payload {
    if (-not (Test-Path -LiteralPath (Join-Path $PayloadDir 'index.tsx'))) {
        throw "Plugin payload is incomplete: $PayloadDir. Extract the whole ZIP first."
    }
    $script:PluginDir = Join-Path $script:VencordDir 'src\userplugins\SonyTranslator'
    Assert-SafePluginPath $script:PluginDir $script:VencordDir
    New-Item -ItemType Directory -Force -Path (Split-Path $script:PluginDir -Parent) | Out-Null

    $installedVersion = Get-InstalledPluginVersion $script:PluginDir
    if ($installedVersion) { Write-Host "Installed SonyTranslator: $installedVersion" }
    else { Write-Host 'Installed SonyTranslator: none' }

    $script:HadPreviousPlugin = Test-Path -LiteralPath $script:PluginDir
    if ($script:HadPreviousPlugin) {
        $backupRoot = Join-Path $BaseDir 'backups'
        New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
        $script:BackupDir = Join-Path $backupRoot ("SonyTranslator-" + [DateTime]::UtcNow.ToString('yyyyMMddHHmmssfff'))
        Copy-Item -LiteralPath $script:PluginDir -Destination $script:BackupDir -Recurse
        Write-Good 'Temporary plugin backup created'
    }

    if (Test-Path -LiteralPath $script:PluginDir) {
        Assert-SafePluginPath $script:PluginDir $script:VencordDir
        Remove-Item -LiteralPath $script:PluginDir -Recurse -Force
    }
    Copy-Item -LiteralPath $PayloadDir -Destination $script:PluginDir -Recurse
    $script:PayloadInstalled = $true
    Write-Good "SonyTranslator $PluginVersion prepared."
}

function Restore-PreviousPlugin {
    if (-not $script:PayloadInstalled -or -not $script:PluginDir) { return }
    Assert-SafePluginPath $script:PluginDir $script:VencordDir
    if (Test-Path -LiteralPath $script:PluginDir) { Remove-Item -LiteralPath $script:PluginDir -Recurse -Force }
    if ($script:HadPreviousPlugin -and $script:BackupDir -and (Test-Path -LiteralPath $script:BackupDir)) {
        Copy-Item -LiteralPath $script:BackupDir -Destination $script:PluginDir -Recurse
        Write-Warn 'Previous SonyTranslator files restored.'
    } else {
        Write-Warn 'Failed fresh install removed; no previous plugin existed.'
    }
}

function Remove-TemporaryBackup {
    if ($script:BackupDir -and (Test-Path -LiteralPath $script:BackupDir)) {
        $backupRoot = Get-FullPath (Join-Path $BaseDir 'backups')
        $actual = Get-FullPath $script:BackupDir
        if (-not $actual.StartsWith($backupRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing unsafe backup cleanup path: $actual"
        }
        Remove-Item -LiteralPath $script:BackupDir -Recurse -Force
    }
}

function Inject-Vencord([string]$Directory) {
    if ($SkipInject -or $BuildMode -ne 'Normal') { return }
    Write-Step 'Injecting the verified custom Vencord build'
    Push-Location $Directory
    try {
        Invoke-InstallerCommand 'node.exe' @('scripts\runInstaller.mjs', '--', '--install', '--branch', 'auto')
    } finally { Pop-Location }
}

function Start-DiscordAfterOperation([string]$ClientId, [string]$Reason) {
    if ($SkipDiscordLaunch -or -not $script:DiscordWasStopped -or -not $ClientId) { return $false }
    $client = Get-DiscordClient $ClientId
    if (-not $client) {
        Write-Warn "Cannot restart unknown Discord client type: $ClientId"
        return $false
    }

    Write-Step "Restarting Discord $ClientId after $Reason"
    try {
        if ($TestDiscordLaunchLog) {
            Add-Content -LiteralPath $TestDiscordLaunchLog -Value "ATTEMPT $ClientId $Reason" -Encoding utf8
            if ($TestDiscordLaunchFailure) { throw 'Simulated Discord restart failure.' }
            Add-Content -LiteralPath $TestDiscordLaunchLog -Value "STARTED $ClientId" -Encoding utf8
        } else {
            $update = Join-Path $env:LOCALAPPDATA "$($client.Root)\Update.exe"
            if (-not (Test-Path -LiteralPath $update -PathType Leaf)) {
                throw "$update was not found."
            }
            Start-Process -FilePath $update -ArgumentList '--processStart', $client.Exe -ErrorAction Stop
        }
        Write-Good "Discord $ClientId restart requested."
        return $true
    } catch {
        Write-Warn "SonyTranslator operation completed, but Discord $ClientId could not be restarted: $($_.Exception.Message)"
        return $false
    }
}

New-Item -ItemType Directory -Force -Path $BaseDir | Out-Null
try { Start-Transcript -Path $LogPath -Append | Out-Null } catch { }

try {
    Write-Host 'SonyTranslator AutoInstaller' -ForegroundColor Magenta
    Write-Host "Installer/plugin version: $PluginVersion"
    $script:PreviouslyRunningDiscordClient = Get-RunningDiscordClient
    if ($script:PreviouslyRunningDiscordClient) {
        Write-Good "Detected running Discord client: $($script:PreviouslyRunningDiscordClient)"
    } else {
        Write-Host 'No running Discord client detected; no client will be guessed after installation.'
    }
    Stop-RunningDiscordClients
    Install-Prerequisites
    $script:VencordDir = Select-VencordDirectory
    Prepare-VencordSource $script:VencordDir
    Install-Payload
    Invoke-VencordBuild $script:VencordDir
    Inject-Vencord $script:VencordDir
    [void](Start-DiscordAfterOperation $script:PreviouslyRunningDiscordClient 'successful installation')
    Remove-TemporaryBackup
    Write-Good "SonyTranslator $PluginVersion installed successfully."
    Write-Host "Log: $LogPath" -ForegroundColor DarkGray
    exit 0
} catch {
    Write-Host "`nINSTALL FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $rollbackSucceeded = $false
    try {
        Restore-PreviousPlugin
        if ($script:HadPreviousPlugin -and $script:VencordDir -and $BuildMode -eq 'Normal') {
            Write-Step 'Rebuilding the previous plugin after rollback'
            Invoke-VencordBuild $script:VencordDir
        }
        $rollbackSucceeded = $true
    } catch {
        Write-Host "ROLLBACK WARNING: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    if ($rollbackSucceeded) {
        [void](Start-DiscordAfterOperation $script:PreviouslyRunningDiscordClient 'rollback')
    }
    Write-Host "No other Vencord plugins or Discord settings were removed. Log: $LogPath" -ForegroundColor Yellow
    exit 1
} finally {
    try { Stop-Transcript | Out-Null } catch { }
    if (-not $NonInteractive -and $Host.Name -match 'ConsoleHost') {
        Write-Host "`nPress Enter to close."
        [void](Read-Host)
    }
}
