# Synthetic fixtures only; never touch a real Discord installation.
function Write-TestDiscordAsar([string]$Path, [string]$Patcher, [string]$Main = 'index.js') {
    $js = [Text.Encoding]::UTF8.GetBytes('require(' + (ConvertTo-Json -InputObject $Patcher -Compress) + ')')
    $package = [Text.Encoding]::UTF8.GetBytes((@{ name = 'discord'; main = $Main } | ConvertTo-Json -Compress))
    $header = @{ files = @{ 'index.js' = @{ size = $js.Length; offset = '0' }; 'package.json' = @{ size = $package.Length; offset = [string]$js.Length } } } | ConvertTo-Json -Depth 5 -Compress
    $json = [Text.Encoding]::UTF8.GetBytes($header)
    $aligned = [int]([Math]::Ceiling($json.Length / 4.0) * 4)
    $stream = New-Object IO.MemoryStream
    $writer = New-Object IO.BinaryWriter($stream)
    try {
        $writer.Write([uint32]4); $writer.Write([uint32]($aligned + 8))
        $writer.Write([uint32]($aligned + 4)); $writer.Write([uint32]$json.Length)
        $writer.Write($json)
        for ($i = $json.Length; $i -lt $aligned; $i++) { $writer.Write([byte]0) }
        $writer.Write($js); $writer.Write($package); $writer.Flush()
        [IO.File]::WriteAllBytes($Path, $stream.ToArray())
    } finally { $writer.Dispose(); $stream.Dispose() }
}

function New-TestDiscord([string]$LocalData, [string]$Client, [string]$Patcher, [string]$Version = '1.0.1') {
    $name = switch ($Client) { 'Stable' { 'Discord' }; 'Canary' { 'DiscordCanary' }; 'PTB' { 'DiscordPTB' }; default { throw 'Invalid fixture client' } }
    $root = Join-Path $LocalData $name
    $app = Join-Path $root "app-$Version"
    $resources = Join-Path $app 'resources'
    New-Item -ItemType Directory -Path $resources -Force | Out-Null
    [IO.File]::WriteAllText((Join-Path $root 'Update.exe'), 'fixture')
    [IO.File]::WriteAllText((Join-Path $app "$name.exe"), 'fixture')
    if ($Patcher) {
        $dist = Split-Path $Patcher -Parent
        New-Item -ItemType Directory -Path $dist -Force | Out-Null
        foreach ($file in @('patcher.js', 'renderer.js', 'preload.js')) { [IO.File]::WriteAllText((Join-Path $dist $file), '// synthetic') }
        Write-TestDiscordAsar (Join-Path $resources 'app.asar') $Patcher
        [IO.File]::WriteAllText((Join-Path $resources '_app.asar'), 'original Discord fixture')
    } else { [IO.File]::WriteAllText((Join-Path $resources 'app.asar'), 'original Discord fixture') }
    return $resources
}
