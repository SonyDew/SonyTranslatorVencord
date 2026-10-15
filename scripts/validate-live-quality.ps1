[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$VencordPath,
    [string]$OutputDirectory
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
if (-not $OutputDirectory) {
    $OutputDirectory = Join-Path $root ('release/quality-checks/' + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N'))
}
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
$VencordPath = [IO.Path]::GetFullPath($VencordPath)

function Invoke-QualityCommand([string]$Command, [string[]]$Arguments) {
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Quality validation stopped: $Command exited with $LASTEXITCODE" }
}

# This command never installs, stops Discord, updates source, or copies over a
# checkout. Prepare an isolated Vencord checkout with the candidate plugin first.
# Refuse to report a successful integration build of stale/different plugin code.
foreach ($file in @('index.tsx', 'styles.css', 'translationCore.ts', 'translationRunner.ts',
    'requestQueue.ts', 'localization.ts', 'slangDataset.ts', 'slang-dataset.json')) {
    $candidate = (Get-Content -LiteralPath (Join-Path $root $file) -Raw -Encoding UTF8).Replace("`r`n", "`n")
    $integration = (Get-Content -LiteralPath (Join-Path $VencordPath "src/userplugins/SonyTranslator/$file") -Raw -Encoding UTF8).Replace("`r`n", "`n")
    if ($candidate -cne $integration) { throw "Vencord contains a different candidate: $file. Copy the plugin into an isolated checkout first." }
}

Push-Location $root
try {
    Invoke-QualityCommand 'npm.cmd' @('run', 'check')
    $capture = 'scripts/capture-google-quality.ts'
    Invoke-QualityCommand 'npx.cmd' @('tsx', $capture, $VencordPath, (Join-Path $OutputDirectory 'multilingual.json'))
    Invoke-QualityCommand 'npx.cmd' @('tsx', $capture, $VencordPath, (Join-Path $OutputDirectory 'gaming-spending.json'), 'benchmark/gaming-spending-samples.json')
    Invoke-QualityCommand 'npx.cmd' @('tsx', $capture, $VencordPath, (Join-Path $OutputDirectory 'trading-chat.json'), 'benchmark/trading-chat-samples.json')
    Invoke-QualityCommand 'npx.cmd' @('tsx', $capture, $VencordPath, (Join-Path $OutputDirectory 'stat-grammar.json'), 'benchmark/stat-grammar-samples.json')
    Invoke-QualityCommand 'npx.cmd' @('tsx', $capture, $VencordPath, (Join-Path $OutputDirectory 'dictionary-context.json'), 'benchmark/dictionary-context-samples.json')
    Invoke-QualityCommand 'npx.cmd' @('tsx', $capture, $VencordPath, (Join-Path $OutputDirectory 'crafting-chat.json'), 'benchmark/crafting-chat-samples.json')
} finally { Pop-Location }

$package = Get-Content -LiteralPath (Join-Path $VencordPath 'package.json') -Raw | ConvertFrom-Json
if ($package.packageManager -notmatch '^pnpm@\d+\.\d+\.\d+(?:\+sha\d+\.[a-fA-F0-9]+)?$') { throw 'Review the upstream package manager before building.' }
Push-Location $VencordPath
try {
    Invoke-QualityCommand 'npx.cmd' @('--yes', $package.packageManager, 'testTsc')
    Invoke-QualityCommand 'npx.cmd' @('--yes', $package.packageManager, 'build')
} finally { Pop-Location }
Write-Host "PASS: offline tests, live Google checks, matching candidate, full Vencord typecheck/build. Reports: $OutputDirectory"
