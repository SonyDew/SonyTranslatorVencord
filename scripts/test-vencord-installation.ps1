$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
. (Join-Path $root 'installer/VencordInstallation.ps1')
. (Join-Path $PSScriptRoot 'installer-fixtures.ps1')
$scratch = Join-Path ([IO.Path]::GetTempPath()) ('sony-vencord-detection-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $scratch | Out-Null
$local = Join-Path $scratch 'local'
$patcher = Join-Path $scratch 'private/dist/patcher.js'
$script:checks = 0
function Check([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }; $script:checks++
}
function Reject([scriptblock]$Action, [string]$Message) {
    $failed = $false; try { & $Action | Out-Null } catch { $failed = $true }
    Check $failed $Message
}

Check (@(Get-SonyDiscordInstallations $local).Count -eq 0) 'Source/settings alone cannot be an install'
$resources = New-TestDiscord $local 'Stable' ''
$states = @(Get-SonyDiscordInstallations $local)
Check ($states.Count -eq 1 -and $states[0].State -eq 'NoVencord') 'Vanilla Discord must be unpatched'
Reject { Select-SonyDiscordInstallation $states 'Auto' 'Stable' $true $patcher } 'Update must reject removed Vencord'
Check ((Select-SonyDiscordInstallation $states 'Auto' 'Stable' $false $patcher).Client -eq 'Stable') 'Explicit install supports vanilla Discord'

$resources = New-TestDiscord $local 'Stable' $patcher
$states = @(Get-SonyDiscordInstallations $local)
Check ($states[0].State -eq 'Active') 'Private build must be detected'
Check ((Select-SonyDiscordInstallation $states 'Auto' 'Stable' $true $patcher).Client -eq 'Stable') 'Private build can update'
$official = Join-Path $scratch 'roaming/Vencord/dist/patcher.js'
[void](New-TestDiscord $local 'Canary' $official)
$states = @(Get-SonyDiscordInstallations $local)
Check (($states | Where-Object Client -eq 'Canary').State -eq 'Active') 'Official Vencord path also counts as installed'
Reject { Select-SonyDiscordInstallation $states 'Auto' 'Canary' $true $patcher } 'Different client build cannot count for an update'
Check ((Select-SonyDiscordInstallation $states 'Auto' '' $true $patcher).Client -eq 'Stable') 'No-running update selects the unique matching build'
Reject { Select-SonyDiscordInstallation $states 'Auto' '' $false $patcher } 'Multiple fresh targets must be explicit'
Reject { Select-SonyDiscordInstallation $states 'Canary' 'Stable' $false $patcher } 'Running and selected identities cannot be mixed'
[void](New-TestDiscord $local 'PTB' $patcher)
Check ((Select-SonyDiscordInstallation @(Get-SonyDiscordInstallations $local) 'Auto' 'PTB' $true $patcher).Client -eq 'PTB') 'PTB stays PTB'
Reject { Select-SonyDiscordInstallation @(Get-SonyDiscordInstallations $local) 'Auto' '' $true $patcher } 'Multiple matching builds require explicit selection'

$missing = Join-Path $scratch 'removed/dist/patcher.js'
Write-TestDiscordAsar (Join-Path $resources 'app.asar') $missing
Check ((@(Get-SonyDiscordInstallations $local) | Where-Object Client -eq 'Stable').State -eq 'Broken') 'Dangling loader is not active'
Write-TestDiscordAsar (Join-Path $resources 'app.asar') $patcher 'other.js'
Check ($null -eq (Read-SonyVencordLoader $resources)) 'Inactive index.js must not count'
[IO.File]::WriteAllText((Join-Path $resources 'app.asar'), '/* require("C:\fake\patcher.js") */')
Check ($null -eq (Read-SonyVencordLoader $resources)) 'A string in a non-ASAR file must not count'
$bad = New-Object byte[] 16; [BitConverter]::GetBytes([uint32]4).CopyTo($bad, 0); [BitConverter]::GetBytes([uint32]::MaxValue).CopyTo($bad, 4)
[IO.File]::WriteAllBytes((Join-Path $resources 'app.asar'), $bad)
Check ($null -eq (Read-SonyVencordLoader $resources)) 'Bad ASAR bounds must fail closed'
[void](New-TestDiscord $local 'Stable' $patcher '1.0.2')
[void](New-TestDiscord $local 'Stable' '' '1.0.10')
Check ((@(Get-SonyDiscordInstallations $local) | Where-Object Client -eq 'Stable').State -eq 'NoVencord') 'Old patched app-1.0.2 cannot mask vanilla app-1.0.10'
Reject { Select-SonyDiscordInstallation @(Get-SonyDiscordInstallations $local) 'Stable' '' $false $patcher } 'Numeric/lexical CLI disagreement must stop before mutation'

$oldLocal = $env:LOCALAPPDATA
try {
    $env:LOCALAPPDATA = $local
    $selected = (@(Get-SonyDiscordInstallations $local) | Where-Object Client -eq 'PTB')
    Assert-SonyDiscordInjection $selected $patcher; $script:checks++
    Reject { Assert-SonyDiscordInjection $selected $official } 'Wrong injection must fail post-validation'

    # Exercise the actual transaction helpers with fake files and a stubbed CLI.
    $tokens = $null; $errors = $null
    $ast = [Management.Automation.Language.Parser]::ParseFile((Join-Path $root 'installer/Install-SonyTranslator.ps1'), [ref]$tokens, [ref]$errors)
    Check ($errors.Count -eq 0) 'Installer must parse on Windows PowerShell 5.1'
    foreach ($name in @('Get-FullPath', 'Backup-DiscordLoader', 'Restore-DiscordLoader', 'Inject-Vencord',
        'Assert-SafePluginPath', 'Get-InstalledPluginVersion', 'Install-Payload', 'Restore-PreviousPlugin')) {
        $definition = $ast.Find({ param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $name }, $true)
        Invoke-Expression $definition.Extent.Text
    }
    function Write-Step($Text) { }
    function Write-Good($Text) { }
    function Write-Warn($Text) { }
    $BuildMode = 'Normal'; $SkipInject = $false
    $BaseDir = Join-Path $scratch 'backups-root'
    $script:SelectedDiscord = $selected
    $script:InjectionAttempted = $false
    $script:LoaderBackup = $null
    $originalLoader = [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $selected.Resources 'app.asar')))
    Backup-DiscordLoader
    [IO.File]::WriteAllText((Join-Path $selected.Resources 'app.asar'), 'failed injection')
    $script:InjectionAttempted = $true
    Restore-DiscordLoader
    Check ([Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $selected.Resources 'app.asar'))) -eq $originalLoader) 'Rollback must restore exact loader bytes'

    $privateRoot = Split-Path (Split-Path $patcher -Parent) -Parent
    $cli = Join-Path $privateRoot 'dist/Installer/VencordInstallerCli.exe'
    New-Item -ItemType Directory -Path (Split-Path $cli -Parent) -Force | Out-Null
    New-Item -ItemType File -Path $cli | Out-Null
    $script:cliCalls = @()
    function Invoke-InstallerCommand($File, $Arguments) {
        $script:cliCalls += ,@($File, $Arguments)
        if ($File -eq $cli) { throw 'Simulated native injection failure' }
    }
    $dataBefore = $env:VENCORD_USER_DATA_DIR; $devBefore = $env:VENCORD_DEV_INSTALL
    Reject { Inject-Vencord $privateRoot } 'Native exit failure must not be swallowed'
    Check ($script:cliCalls.Count -eq 2 -and $script:cliCalls[1][1][1] -eq '--location' -and
        $script:cliCalls[1][1][2] -eq $selected.Root) 'CLI must bind to the selected client root'
    Check ($env:VENCORD_USER_DATA_DIR -eq $dataBefore -and $env:VENCORD_DEV_INSTALL -eq $devBefore) 'Injection environment must be restored on failure'

    # Native exit zero without a working loader must still not be success.
    function Invoke-InstallerCommand($File, $Arguments) {
        if ($File -eq $cli) { [IO.File]::WriteAllText((Join-Path $selected.Resources 'app.asar'), 'wrong loader') }
    }
    Reject { Inject-Vencord $privateRoot } 'Zero native exit without verified injection cannot report success'
    Restore-DiscordLoader
    Check ([Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $selected.Resources 'app.asar'))) -eq $originalLoader) 'Post-check failure must be recoverable'
    [void](New-TestDiscord $local 'PTB' $patcher '1.0.2')
    Reject { Assert-SonyDiscordTargetUnchanged $selected } 'Updated Discord version cannot reuse the old snapshot'

    $script:VencordDir = $privateRoot
    $script:PayloadInstalled = $false
    $PayloadDir = Join-Path $scratch 'payload'
    $PluginVersion = '0.9.6'
    $plugin = Join-Path $privateRoot 'src/userplugins/SonyTranslator'
    New-Item -ItemType Directory -Path $plugin, $PayloadDir -Force | Out-Null
    [IO.File]::WriteAllText((Join-Path $PayloadDir 'index.tsx'), 'new payload')
    [IO.File]::WriteAllText((Join-Path $plugin 'marker.txt'), 'previous plugin')
    function Copy-Item([string]$LiteralPath, [string]$Destination, [switch]$Recurse, [switch]$Force) {
        if ($LiteralPath -eq $PayloadDir) { throw 'Simulated partial-copy failure' }
        Microsoft.PowerShell.Management\Copy-Item -LiteralPath $LiteralPath -Destination $Destination -Recurse:$Recurse -Force:$Force
    }
    Reject { Install-Payload } 'Partial copy failure must be recoverable'
    Restore-PreviousPlugin
    Check (([IO.File]::ReadAllText((Join-Path $plugin 'marker.txt'))) -eq 'previous plugin') 'Partial copy must restore old source files'

    # A failed fresh injection must restore vanilla Discord, not install a mod
    # during rollback merely because stale plugin sources exist.
    $freshLocal = Join-Path $scratch 'fresh-local'
    [void](New-TestDiscord $freshLocal 'Stable' '')
    $env:LOCALAPPDATA = $freshLocal
    $script:SelectedDiscord = @(Get-SonyDiscordInstallations)[0]
    $script:InjectionAttempted = $false
    Backup-DiscordLoader
    $freshResources = $script:SelectedDiscord.Resources
    Write-TestDiscordAsar (Join-Path $freshResources 'app.asar') $patcher
    [IO.File]::WriteAllText((Join-Path $freshResources '_app.asar'), 'injection backup')
    $script:InjectionAttempted = $true
    Restore-DiscordLoader
    Check (([IO.File]::ReadAllText((Join-Path $freshResources 'app.asar'))) -eq 'original Discord fixture' -and
        -not (Test-Path -LiteralPath (Join-Path $freshResources '_app.asar'))) 'Failed fresh injection must restore vanilla bootstrap and remove only its generated backup'
} finally { $env:LOCALAPPDATA = $oldLocal }
Write-Host "PASS: $script:checks Vencord installation checks"
