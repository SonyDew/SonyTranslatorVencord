# Source-available under LICENSE; copyright SonyDev.
# Pure validation helpers. Dot-sourcing this file never downloads or installs.
function Get-SonyFileHash([string]$Path) {
    $stream = [IO.File]::OpenRead($Path)
    $sha = [Security.Cryptography.SHA256]::Create()
    try { return ([BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-', '').ToLowerInvariant() }
    finally { $sha.Dispose(); $stream.Dispose() }
}

function Get-SonyReleasePlan($Release, [version]$CurrentVersion) {
    if ($Release.draft -ne $false -or $Release.prerelease -ne $false -or
        $Release.tag_name -notmatch '^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$') {
        throw 'The release is not a stable, versioned SonyTranslator release.'
    }
    $versionText = $Release.tag_name.Substring(1)
    $version = [version]$versionText
    if ($version -lt $CurrentVersion) { throw 'Refusing to downgrade SonyTranslator.' }
    if ($version -eq $CurrentVersion) { return $null }
    $name = "SonyTranslator-AutoInstaller-$versionText.zip"
    $assets = @($Release.assets | Where-Object { $_.name -ceq $name })
    if ($assets.Count -ne 1) { throw 'The release must contain exactly one matching installer archive.' }
    $asset = $assets[0]
    $expectedUrl = "https://github.com/SonyDew/SonyTranslatorVencord/releases/download/$($Release.tag_name)/$name"
    if ($asset.browser_download_url -cne $expectedUrl -or $asset.digest -cnotmatch '^sha256:[a-f0-9]{64}$') {
        throw 'The installer has an untrusted URL or is missing its GitHub SHA-256 digest.'
    }
    if ($asset.size -le 0 -or $asset.size -gt 50MB) { throw 'The installer archive exceeds the download limit.' }
    return [pscustomobject]@{ Version = $versionText; Url = $expectedUrl; Hash = $asset.digest.Substring(7); Size = [long]$asset.size }
}

function Assert-SonyArchive([string]$Path, $Plan) {
    if ((Get-Item -LiteralPath $Path).Length -ne $Plan.Size -or
        (Get-SonyFileHash $Path) -ine $Plan.Hash) {
        throw 'The downloaded installer failed SHA-256/size verification. Nothing was installed.'
    }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [IO.Compression.ZipFile]::OpenRead($Path)
    try {
        $names = New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
        [long]$total = 0
        if ($zip.Entries.Count -gt 10000) { throw 'Too many files in the release archive.' }
        foreach ($entry in $zip.Entries) {
            $name = $entry.FullName.Replace('\', '/')
            if (-not $name.StartsWith('SonyTranslator-AutoInstaller/', [StringComparison]::Ordinal) -or
                $name -match '(^|/)\.{1,2}(/|$)|:|[\x00-\x1f]' -or
                $name -match '/[^/]*[ .](/|$)' -or
                $name -match '(?i)(^|/)(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|/|$)' -or
                (($entry.ExternalAttributes -shr 16) -band 0xf000) -eq 0xa000 -or
                -not $names.Add($name.TrimEnd('/'))) {
                throw 'The release archive contains an unsafe or duplicate path.'
            }
            $total += $entry.Length
            if ($total -gt 100MB) { throw 'The unpacked release exceeds the size limit.' }
        }
        foreach ($required in @('Install-SonyTranslator.ps1', 'payload/SonyTranslator/index.tsx',
            'payload/SonyTranslator/translationCore.ts', 'payload/SonyTranslator/slang-dataset.json')) {
            if (-not $names.Contains("SonyTranslator-AutoInstaller/$required")) { throw 'The release payload is incomplete.' }
        }
    } finally { $zip.Dispose() }
}

function Assert-SonyPayloadVersion([string]$Root, [string]$Version) {
    $installer = Get-Content -LiteralPath (Join-Path $Root 'Install-SonyTranslator.ps1') -Raw
    $plugin = Get-Content -LiteralPath (Join-Path $Root 'payload/SonyTranslator/index.tsx') -Raw
    $escaped = [regex]::Escape($Version)
    if ($installer -notmatch "(?m)^\`$PluginVersion = '$escaped'\r?$" -or
        $plugin -notmatch "v$escaped(?![\d.])") { throw 'Installer and plugin versions do not match the release.' }
}
