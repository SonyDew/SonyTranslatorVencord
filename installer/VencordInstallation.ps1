# Source-available under LICENSE; copyright SonyDev.
# Read-only detection. A source checkout or a leftover settings folder is NOT an installation.
function Read-SonyVencordLoader([string]$Resources) {
    $asar = Join-Path $Resources 'app.asar'
    if (-not (Test-Path -LiteralPath $asar -PathType Leaf)) { return $null }
    # Official Vencord bootstraps are tiny. Never scan a full Discord archive for
    # strings: an inactive bundled string must not count as an executed loader.
    $stream = [IO.File]::OpenRead($asar)
    try {
        if ($stream.Length -lt 16 -or $stream.Length -gt 256KB) { return $null }
        $reader = New-Object IO.BinaryReader($stream)
        if ($reader.ReadUInt32() -ne 4) { return $null }
        $headerSize = $reader.ReadUInt32()
        $objectSize = $reader.ReadUInt32()
        $jsonSize = $reader.ReadUInt32()
        if ($headerSize -gt 64KB -or $headerSize -lt 8 -or $objectSize -ne $headerSize - 4 -or
            $jsonSize -gt $headerSize - 8 -or 8L + $headerSize -gt $stream.Length) { return $null }
        $header = [Text.Encoding]::UTF8.GetString($reader.ReadBytes($jsonSize)) | ConvertFrom-Json
        $texts = @{}
        foreach ($name in @('index.js', 'package.json')) {
            $entry = $header.files.$name
            [long]$offset = 0
            if (-not $entry -or $entry.unpacked -or $entry.link -or
                -not [long]::TryParse([string]$entry.offset, [ref]$offset) -or $offset -lt 0 -or
                $entry.size -lt 1 -or $entry.size -gt 16KB -or
                8L + $headerSize + $offset + $entry.size -gt $stream.Length) { return $null }
            $stream.Position = 8L + $headerSize + $offset
            $texts[$name] = [Text.Encoding]::UTF8.GetString($reader.ReadBytes([int]$entry.size))
        }
        $package = $texts['package.json'] | ConvertFrom-Json
        if ($package.main -notin @('index.js', './index.js')) { return $null }
        # Parse the official literal require without executing JavaScript.
        if ($texts['index.js'] -notmatch '^\s*require\(("(?:\\.|[^"\\])*")\);?\s*$') { return $null }
        $patcher = $Matches[1] | ConvertFrom-Json
        if (-not [IO.Path]::IsPathRooted($patcher) -or (Split-Path $patcher -Leaf) -ine 'patcher.js') { return $null }
        return [IO.Path]::GetFullPath($patcher)
    } catch { return $null } finally { $stream.Dispose() }
}

function Get-SonyDiscordInstallations([string]$LocalData = $env:LOCALAPPDATA) {
    foreach ($client in @(
        @{ Id = 'Stable'; Root = 'Discord'; Exe = 'Discord.exe' },
        @{ Id = 'Canary'; Root = 'DiscordCanary'; Exe = 'DiscordCanary.exe' },
        @{ Id = 'PTB'; Root = 'DiscordPTB'; Exe = 'DiscordPTB.exe' }
    )) {
        $root = Join-Path $LocalData $client.Root
        if (-not (Test-Path -LiteralPath (Join-Path $root 'Update.exe') -PathType Leaf)) { continue }
        $versions = @(Get-ChildItem -LiteralPath $root -Directory -Filter 'app-*' -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -match '^app-\d+\.\d+\.\d+(?:\.\d+)?$' } |
            Sort-Object { [version]$_.Name.Substring(4) } -Descending)
        # Only the current installation counts; an older patched version must
        # not make an unpatched current version look healthy.
        if (-not $versions.Count) { continue }
        $app = $versions[0].FullName
        if (-not (Test-Path -LiteralPath (Join-Path $app $client.Exe) -PathType Leaf)) { continue }
        $resources = Join-Path $app 'resources'
        $patcher = Read-SonyVencordLoader $resources
        $state = 'NoVencord'
        if ($patcher) {
            $state = 'Active'
            foreach ($file in @('patcher.js', 'renderer.js', 'preload.js')) {
                if (-not (Test-Path -LiteralPath (Join-Path (Split-Path $patcher -Parent) $file) -PathType Leaf)) { $state = 'Broken' }
            }
            if (-not (Test-Path -LiteralPath (Join-Path $resources '_app.asar') -PathType Leaf)) { $state = 'Broken' }
        }
        # The upstream Windows CLI currently sorts resource paths lexically.
        # If that disagrees with the current numeric version, do not let it
        # mutate an older directory that was not selected/backed up.
        $cliVersion = $versions | Sort-Object FullName -Descending | Select-Object -First 1
        [pscustomobject]@{ Client = $client.Id; Root = $root; Resources = $resources; Patcher = $patcher; State = $state;
            PatchTargetMatchesCurrent = $cliVersion.FullName -eq $app }
    }
}

function Select-SonyDiscordInstallation($Installations, [string]$RequestedClient, [string]$RunningClient,
    [bool]$Updating, [string]$ExpectedPatcher) {
    $candidates = @($Installations)
    if ($RequestedClient -ne 'Auto') {
        if ($RunningClient -and $RunningClient -ne $RequestedClient) {
            throw 'The selected Discord client differs from the running client. Close Discord first or select the same client.'
        }
        $candidates = @($candidates | Where-Object { $_.Client -eq $RequestedClient })
    } elseif ($RunningClient) {
        $candidates = @($candidates | Where-Object { $_.Client -eq $RunningClient })
    } elseif ($Updating) {
        $candidates = @($candidates | Where-Object { $_.State -eq 'Active' -and $_.Patcher -ieq $ExpectedPatcher })
    }
    if ($candidates.Count -eq 0) {
        throw 'No matching Discord installation was found. If Vencord was removed, run Install SonyTranslator.cmd to install it again; Update will not reinstall it silently.'
    }
    if ($candidates.Count -gt 1) {
        throw 'More than one Discord client is available. Start the client you use, or pass -DiscordClient Stable, Canary or PTB.'
    }
    $selected = $candidates[0]
    if (-not $selected.PatchTargetMatchesCurrent) {
        throw 'Discord has conflicting version folders. The Vencord helper would target an older version; repair Discord before installing.'
    }
    if ($Updating -and ($selected.State -ne 'Active' -or $selected.Patcher -ine $ExpectedPatcher)) {
        throw 'Vencord is missing, damaged, or belongs to a different installation. Update stopped without closing Discord. Run Install SonyTranslator.cmd to install or repair the SonyTranslator build.'
    }
    return $selected
}

function Assert-SonyDiscordInjection($Selected, [string]$ExpectedPatcher) {
    $fresh = @(Get-SonyDiscordInstallations | Where-Object { $_.Client -eq $Selected.Client })
    if ($fresh.Count -ne 1 -or $fresh[0].Root -ine $Selected.Root -or
        $fresh[0].Resources -ine $Selected.Resources -or -not $fresh[0].PatchTargetMatchesCurrent -or
        $fresh[0].State -ne 'Active' -or $fresh[0].Patcher -ine $ExpectedPatcher) {
        throw 'The build completed, but Discord is not connected to the verified Vencord build. Installation cannot be reported as successful.'
    }
}

function Assert-SonyDiscordTargetUnchanged($Selected) {
    $fresh = @(Get-SonyDiscordInstallations | Where-Object { $_.Client -eq $Selected.Client })
    if ($fresh.Count -ne 1 -or $fresh[0].Root -ine $Selected.Root -or
        $fresh[0].Resources -ine $Selected.Resources -or -not $fresh[0].PatchTargetMatchesCurrent) {
        throw 'Discord changed during installation. Stopped before injection; retry after its update finishes.'
    }
}
