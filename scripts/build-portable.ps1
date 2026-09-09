param(
  [string]$OutputDirectory = 'release\Schoolyard Defence Portable'
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$distributionRoot = [System.IO.Path]::GetFullPath((Join-Path $repositoryRoot $OutputDirectory))
$gameDirectory = Join-Path $distributionRoot 'game'
$distDirectory = Join-Path $repositoryRoot 'dist'
$launcherDirectory = Join-Path $repositoryRoot 'portable\launcher'

if (-not $distributionRoot.StartsWith($repositoryRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'The output directory must stay inside this repository.'
}

Push-Location $repositoryRoot
try {
  npm run build

  if (Test-Path $distributionRoot) {
    Remove-Item -LiteralPath $distributionRoot -Recurse -Force
  }

  New-Item -ItemType Directory -Path $gameDirectory -Force | Out-Null
  robocopy $distDirectory $gameDirectory /E /XD source sprite-audit | Out-Null
  if ($LASTEXITCODE -gt 7) {
    throw "Could not copy the game files (robocopy exit code $LASTEXITCODE)."
  }

  Push-Location $launcherDirectory
  try {
    $env:GOARCH = '386'
    $env:GOOS = 'windows'
    go build -trimpath -ldflags '-s -w' -o (Join-Path $distributionRoot 'Launch Schoolyard Defence.exe') .
  }
  finally {
    Pop-Location
  }

  @'
Schoolyard Defence Portable

Double-click "Launch Schoolyard Defence.exe" to start the game.
Keep the launcher window open while playing. The game opens in your default browser
and does not need an internet connection after the folder is copied to the computer.

The browser keeps progress and settings on that computer. Copy this entire folder to
the tester's USB drive or local disk; do not move the launcher out of this folder.
'@ | Set-Content -LiteralPath (Join-Path $distributionRoot 'README.txt') -Encoding ascii

  $size = (Get-ChildItem -LiteralPath $distributionRoot -Recurse -File | Measure-Object Length -Sum).Sum
  Write-Host ("Created {0} ({1:N1} MB)" -f $distributionRoot, ($size / 1MB))
}
finally {
  Pop-Location
}
