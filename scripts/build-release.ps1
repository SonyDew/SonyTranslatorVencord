[CmdletBinding()]
param([string]$OutputDirectory)

$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
if (-not $OutputDirectory) { $OutputDirectory = Join-Path $Root 'release' }
$Version = (Get-Content -LiteralPath (Join-Path $Root 'package.json') -Raw | ConvertFrom-Json).version
$SourceZip = Join-Path $OutputDirectory "SonyTranslatorVencord-$Version.zip"
$InstallerZip = Join-Path $OutputDirectory "SonyTranslator-AutoInstaller-$Version.zip"
$RuntimeFiles = @('index.tsx', 'styles.css', 'translationCore.ts', 'translationRunner.ts', 'requestQueue.ts', 'localization.ts', 'slang-dataset.json', 'slangDataset.ts', 'README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md')

function Assert-Version([string]$Path, [string]$Needle) {
    if ((Get-Content -LiteralPath $Path -Raw) -notmatch [regex]::Escape($Needle)) {
        throw "Version mismatch in $Path; expected $Needle"
    }
}

Assert-Version (Join-Path $Root 'index.tsx') "v$Version"
Assert-Version (Join-Path $Root 'README.md') "$Version"
Assert-Version (Join-Path $Root 'installer\Install-SonyTranslator.ps1') "'$Version'"
Assert-Version (Join-Path $Root 'installer\README.txt') "v$Version"

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$TempRoot = Join-Path ([IO.Path]::GetTempPath()) ("sonytranslator-release-" + [guid]::NewGuid().ToString('N'))
$SourceRoot = Join-Path $TempRoot 'source\SonyTranslator'
$InstallerRoot = Join-Path $TempRoot 'installer\SonyTranslator-AutoInstaller'
New-Item -ItemType Directory -Force -Path $SourceRoot, (Join-Path $InstallerRoot 'payload\SonyTranslator') | Out-Null

foreach ($file in $RuntimeFiles) {
    Copy-Item -LiteralPath (Join-Path $Root $file) -Destination (Join-Path $SourceRoot $file)
    Copy-Item -LiteralPath (Join-Path $Root $file) -Destination (Join-Path $InstallerRoot "payload\SonyTranslator\$file")
}
foreach ($file in @('package.json', 'package-lock.json', 'tsconfig.core.json')) {
    Copy-Item -LiteralPath (Join-Path $Root $file) -Destination (Join-Path $SourceRoot $file)
}
Copy-Item -LiteralPath (Join-Path $Root 'tests') -Destination (Join-Path $SourceRoot 'tests') -Recurse
Copy-Item -LiteralPath (Join-Path $Root 'scripts') -Destination (Join-Path $SourceRoot 'scripts') -Recurse
Copy-Item -LiteralPath (Join-Path $Root 'research') -Destination (Join-Path $SourceRoot 'research') -Recurse
Copy-Item -LiteralPath (Join-Path $Root 'benchmark') -Destination (Join-Path $SourceRoot 'benchmark') -Recurse
Copy-Item -LiteralPath (Join-Path $Root 'docs') -Destination (Join-Path $SourceRoot 'docs') -Recurse
Copy-Item -LiteralPath (Join-Path $Root 'installer') -Destination (Join-Path $SourceRoot 'installer') -Recurse
Copy-Item -LiteralPath (Join-Path $Root 'docs') -Destination (Join-Path $InstallerRoot 'payload\SonyTranslator\docs') -Recurse
foreach ($file in @('Install-SonyTranslator.ps1', 'Install SonyTranslator.cmd', 'Update SonyTranslator.cmd', 'Uninstall-SonyTranslator.ps1', 'Uninstall SonyTranslator.cmd', 'README.txt')) {
    Copy-Item -LiteralPath (Join-Path $Root "installer\$file") -Destination (Join-Path $InstallerRoot $file)
}

foreach ($zip in @($SourceZip, $InstallerZip)) {
    $fullOutput = [IO.Path]::GetFullPath($OutputDirectory).TrimEnd('\')
    $fullZip = [IO.Path]::GetFullPath($zip)
    if (-not $fullZip.StartsWith($fullOutput + '\', [StringComparison]::OrdinalIgnoreCase)) { throw "Unsafe release path: $fullZip" }
    if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }
}
Compress-Archive -LiteralPath $SourceRoot -DestinationPath $SourceZip -CompressionLevel Optimal
Compress-Archive -LiteralPath $InstallerRoot -DestinationPath $InstallerZip -CompressionLevel Optimal

Add-Type -AssemblyName System.IO.Compression.FileSystem
foreach ($zip in @($SourceZip, $InstallerZip)) {
    $archive = [IO.Compression.ZipFile]::OpenRead($zip)
    try {
        if (-not $archive.Entries.Count) { throw "Empty ZIP: $zip" }
        if ($archive.Entries.FullName -match 'G:|codex_tmp|AppData') { throw "Development path leaked into $zip" }
    } finally { $archive.Dispose() }
}

Get-FileHash -Algorithm SHA256 -LiteralPath $SourceZip, $InstallerZip |
    Select-Object Path, Hash, @{ Name = 'Bytes'; Expression = { (Get-Item -LiteralPath $_.Path).Length } } |
    Format-Table -AutoSize
