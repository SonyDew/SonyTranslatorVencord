$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$installerPath = Join-Path $root 'installer\Install-SonyTranslator.ps1'
$tokens = $null
$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($installerPath, [ref]$tokens, [ref]$errors)
if ($errors.Count) { throw 'Installer PowerShell syntax is invalid.' }
foreach ($name in @('Write-Step', 'Write-Warn', 'Invoke-InstallerCommand', 'Prepare-VencordSource')) {
    $definition = $ast.Find({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $name }, $true)
    Invoke-Expression $definition.Extent.Text
}

$testRoot = Join-Path ([IO.Path]::GetTempPath()) ('sonytranslator-git-test-' + [guid]::NewGuid().ToString('N'))
$upstream = Join-Path $testRoot 'upstream'
$checkout = Join-Path $testRoot 'checkout'
$LogPath = Join-Path $testRoot 'commands.log'
New-Item -ItemType Directory -Path $upstream -Force | Out-Null
function Git([string]$Directory, [string[]]$Arguments) {
    & git.exe -C $Directory @Arguments | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "Test Git operation failed: $Arguments" }
}
Git $upstream @('init', '-b', 'main')
Git $upstream @('config', 'user.email', 'test@example.invalid')
Git $upstream @('config', 'user.name', 'Installer Test')
Set-Content -LiteralPath (Join-Path $upstream 'package.json') -Value '{"version":"old"}'
Git $upstream @('add', '.')
Git $upstream @('commit', '-m', 'old')
$url = ([uri]$upstream).AbsoluteUri
& git.exe clone --depth 1 $url $checkout | Out-Host
if ($LASTEXITCODE -ne 0) { throw 'Shallow test clone failed.' }
Set-Content -LiteralPath (Join-Path $upstream 'package.json') -Value '{"version":"new"}'
Git $upstream @('commit', '-am', 'new')
# Reproduce the exact installer regression: unrelated shallow boundaries.
Git $checkout @('fetch', '--depth', '1', 'origin', 'main')
Set-Content -LiteralPath (Join-Path $checkout 'local-plugin.txt') -Value 'preserve me'
Prepare-VencordSource $checkout
if ((& git.exe -C $checkout rev-parse HEAD) -ne (& git.exe -C $upstream rev-parse HEAD)) { throw 'Shallow checkout was not updated.' }
if ((Get-Content -LiteralPath (Join-Path $checkout 'local-plugin.txt') -Raw).Trim() -ne 'preserve me') { throw 'Local plugin was lost.' }

# A second update also works after the repository is unshallowed.
Set-Content -LiteralPath (Join-Path $upstream 'package.json') -Value '{"version":"newer"}'
Git $upstream @('commit', '-am', 'newer')
Prepare-VencordSource $checkout
if ((& git.exe -C $checkout rev-parse HEAD) -ne (& git.exe -C $upstream rev-parse HEAD)) { throw 'Full checkout was not updated.' }

# Overlapping local edits must be preserved and must stop stale installation.
Set-Content -LiteralPath (Join-Path $checkout 'package.json') -Value '{"version":"local edit"}'
Set-Content -LiteralPath (Join-Path $upstream 'package.json') -Value '{"version":"latest"}'
Git $upstream @('commit', '-am', 'latest')
$blocked = $false
try { Prepare-VencordSource $checkout } catch { $blocked = $_.Exception.Message -match 'could not fast-forward' }
if (-not $blocked) { throw 'Conflicting local edits did not block installation.' }
if ((Get-Content -LiteralPath (Join-Path $checkout 'package.json') -Raw) -notmatch 'local edit') { throw 'Conflicting local edit was discarded.' }
Write-Host 'PASS: shallow ancestry recovery, repeated update, local-file preservation, conflict stops stale build.'
