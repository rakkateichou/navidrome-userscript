$ErrorActionPreference = "Stop"

$gistId = "36726799658f15dcb156c80fdd0d3183"
$repoRoot = Split-Path -Parent $PSScriptRoot
$scriptPath = Join-Path $repoRoot "navidrome.user.js"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "GitHub CLI (gh) is required to publish the userscript update feed."
}

& gh gist edit $gistId --filename "navidrome.user.js" $scriptPath
if ($LASTEXITCODE -ne 0) {
    throw "Could not publish the userscript update feed."
}

Write-Host "Published navidrome.user.js to the secret GitHub update feed."
