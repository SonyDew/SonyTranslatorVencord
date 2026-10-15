$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
. (Join-Path $root 'installer/ReleaseUpdate.ps1')
$scratch = Join-Path ([IO.Path]::GetTempPath()) ('sony-updater-validation-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $scratch | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem
$script:passed = 0
function Expect-Failure([scriptblock]$Action, [string]$Label) {
    $failed = $false
    try { & $Action } catch { $failed = $true }
    if (-not $failed) { throw "Expected rejection: $Label" }
    $script:passed++
}
function New-Release {
    return [pscustomobject]@{
        draft = $false; prerelease = $false; tag_name = 'v0.9.6'; assets = @([pscustomobject]@{
            name = 'SonyTranslator-AutoInstaller-0.9.6.zip'; size = 1
            browser_download_url = 'https://github.com/SonyDew/SonyTranslatorVencord/releases/download/v0.9.6/SonyTranslator-AutoInstaller-0.9.6.zip'
            digest = 'sha256:' + ('a' * 64)
        })
    }
}
function New-Archive([string[]]$Extra = @(), [switch]$Incomplete, [switch]$Symlink) {
    $path = Join-Path $scratch ([guid]::NewGuid().ToString('N') + '.zip')
    $zip = [IO.Compression.ZipFile]::Open($path, 'Create')
    try {
        $required = @('Install-SonyTranslator.ps1', 'payload/SonyTranslator/index.tsx',
            'payload/SonyTranslator/translationCore.ts', 'payload/SonyTranslator/slang-dataset.json')
        if ($Incomplete) { $required = @('Install-SonyTranslator.ps1') }
        foreach ($name in $required) { [void]$zip.CreateEntry('SonyTranslator-AutoInstaller/' + $name) }
        foreach ($name in $Extra) {
            $entry = $zip.CreateEntry($name)
            if ($Symlink) { $entry.ExternalAttributes = -1577058304 } # 0xA2000000: symlink mode
        }
    } finally { $zip.Dispose() }
    return [pscustomobject]@{ Path = $path; Plan = [pscustomobject]@{
        Hash = Get-SonyFileHash $path
        Size = (Get-Item -LiteralPath $path).Length
    } }
}
$release = New-Release
$plan = Get-SonyReleasePlan $release ([version]'0.9.5')
if ($plan.Version -ne '0.9.6') { throw 'New stable release was not selected.' }; $passed++
if ($null -ne (Get-SonyReleasePlan $release ([version]'0.9.6'))) { throw 'Same-version release must be a no-op.' }; $passed++
Expect-Failure { Get-SonyReleasePlan $release ([version]'0.9.7') } 'downgrade'
foreach ($field in @('draft', 'prerelease')) {
    $invalid = New-Release; $invalid.$field = $true
    Expect-Failure { Get-SonyReleasePlan $invalid ([version]'0.9.5') } $field
}
$invalid = New-Release; $invalid.tag_name = 'v0.9.7-rc.1'
Expect-Failure { Get-SonyReleasePlan $invalid ([version]'0.9.5') } 'prerelease tag'
$invalid = New-Release; $invalid.assets[0].browser_download_url = 'https://example.com/installer.zip'
Expect-Failure { Get-SonyReleasePlan $invalid ([version]'0.9.5') } 'external URL'
$invalid = New-Release; $invalid.assets[0].digest = $null
Expect-Failure { Get-SonyReleasePlan $invalid ([version]'0.9.5') } 'missing digest'
$invalid = New-Release; $invalid.assets += $invalid.assets[0]
Expect-Failure { Get-SonyReleasePlan $invalid ([version]'0.9.5') } 'duplicate assets'
$invalid = New-Release; $invalid.assets[0].size = 51MB
Expect-Failure { Get-SonyReleasePlan $invalid ([version]'0.9.5') } 'large download'
$archive = New-Archive
Assert-SonyArchive $archive.Path $archive.Plan; $passed++
$archive.Plan.Hash = '0' * 64
Expect-Failure { Assert-SonyArchive $archive.Path $archive.Plan } 'hash mismatch'
foreach ($name in @('SonyTranslator-AutoInstaller/../escaped.ps1', 'C:/evil.ps1',
    'SonyTranslator-AutoInstaller/evil.ps1:stream', 'SonyTranslator-AutoInstaller/con.txt',
    'SonyTranslator-AutoInstaller/directory./evil.ps1',
    'SonyTranslator-AutoInstaller/INSTALL-SONYTRANSLATOR.PS1')) {
    $archive = New-Archive @($name)
    Expect-Failure { Assert-SonyArchive $archive.Path $archive.Plan } $name
}
$archive = New-Archive -Incomplete
Expect-Failure { Assert-SonyArchive $archive.Path $archive.Plan } 'missing payload'
$archive = New-Archive @('SonyTranslator-AutoInstaller/link') -Symlink
Expect-Failure { Assert-SonyArchive $archive.Path $archive.Plan } 'symlink'
$payload = Join-Path $scratch 'payload'
New-Item -ItemType Directory -Path (Join-Path $payload 'payload/SonyTranslator') -Force | Out-Null
Set-Content -LiteralPath (Join-Path $payload 'Install-SonyTranslator.ps1') -Value '$PluginVersion = ''0.9.6'''
Set-Content -LiteralPath (Join-Path $payload 'payload/SonyTranslator/index.tsx') -Value 'SonyTranslator - Vencord userplugin v0.9.6'
Assert-SonyPayloadVersion $payload '0.9.6'; $passed++
Expect-Failure { Assert-SonyPayloadVersion $payload '0.9.7' } 'mismatched payload version'

# Test the real injection function with an isolated failing native-command stub.
$tokens = $null; $parseErrors = $null
$ast = [Management.Automation.Language.Parser]::ParseFile((Join-Path $root 'installer/Install-SonyTranslator.ps1'), [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count) { throw $parseErrors[0] }
$function = $ast.Find({ param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'Inject-Vencord' }, $true)
Invoke-Expression $function.Extent.Text
$SkipInject = $false; $BuildMode = 'Normal'
function Write-Step($Text) { }
$script:nativeCalls = 0
function Invoke-InstallerCommand($File, $Arguments) {
    $script:nativeCalls++
    if ($File -like '*.exe' -and $File -notlike '*node.exe') { throw 'Simulated CLI injection failure' }
}
$fake = Join-Path $scratch 'fake-vencord'
New-Item -ItemType Directory -Path (Join-Path $fake 'dist/Installer') -Force | Out-Null
New-Item -ItemType File -Path (Join-Path $fake 'dist/Installer/VencordInstallerCli.exe') | Out-Null
$originalData = $env:VENCORD_USER_DATA_DIR; $originalDev = $env:VENCORD_DEV_INSTALL
Expect-Failure { Inject-Vencord $fake } 'native injection failure propagation'
if ($nativeCalls -ne 2 -or $env:VENCORD_USER_DATA_DIR -ne $originalData -or $env:VENCORD_DEV_INSTALL -ne $originalDev) {
    throw 'Injection did not execute the native CLI or restore environment.'
}; $passed++

# A disk/copy failure after removal must still restore the saved plugin.
foreach ($name in @('Get-FullPath', 'Assert-SafePluginPath', 'Get-InstalledPluginVersion', 'Install-Payload', 'Restore-PreviousPlugin')) {
    $definition = $ast.Find({ param($node) $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $name }, $true)
    Invoke-Expression $definition.Extent.Text
}
function Write-Good($Text) { }
function Write-Warn($Text) { }
$BaseDir = Join-Path $scratch 'local-data'
$PayloadDir = Join-Path $scratch 'replacement'
$PluginVersion = '0.9.6'
$script:VencordDir = $fake; $script:PayloadInstalled = $false
$oldPlugin = Join-Path $fake 'src/userplugins/SonyTranslator'
New-Item -ItemType Directory -Path $oldPlugin, $PayloadDir -Force | Out-Null
Set-Content -LiteralPath (Join-Path $PayloadDir 'index.tsx') -Value 'replacement'
Set-Content -LiteralPath (Join-Path $oldPlugin 'marker.txt') -Value 'previous plugin'
function Copy-Item([string]$LiteralPath, [string]$Destination, [switch]$Recurse) {
    if ($LiteralPath -eq $PayloadDir) { throw 'Simulated partial payload copy failure' }
    Microsoft.PowerShell.Management\Copy-Item -LiteralPath $LiteralPath -Destination $Destination -Recurse:$Recurse
}
Expect-Failure { Install-Payload } 'partial payload copy'
Restore-PreviousPlugin
if ((Get-Content -LiteralPath (Join-Path $oldPlugin 'marker.txt')) -ne 'previous plugin') { throw 'Partial-copy rollback lost the old plugin.' }
$passed++
Write-Host "PASS: $passed updater validation checks. Fixtures: $scratch"
