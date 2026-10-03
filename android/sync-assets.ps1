$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
foreach ($name in @('styles.css', 'content.js')) {
    Copy-Item -LiteralPath (Join-Path $root $name) -Destination (Join-Path $PSScriptRoot "app/src/main/assets/$name")
}
