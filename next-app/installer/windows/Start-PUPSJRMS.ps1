param([Parameter(Mandatory = $true)][string]$AppRoot, [switch]$Stop)
$ErrorActionPreference = 'Stop'
trap {
  Write-Host "PUPSJ RMS action failed: $_" -ForegroundColor Red
  Read-Host 'Press Enter to close'
  exit 1
}
. (Join-Path $PSScriptRoot 'PUPSJRMSDocker.ps1')
$paths = Get-PUPSJDockerPaths
if (-not $paths.Cli -or -not (Test-Path -LiteralPath $paths.Cli -PathType Leaf)) {
  throw 'Docker Desktop or its CLI was not found. Repair Docker Desktop, then try again.'
}
if ($Stop) {
  Push-Location $AppRoot
  try {
    & $paths.Cli compose down
    if ($LASTEXITCODE -ne 0) { throw 'Docker Compose could not stop PUPSJ RMS.' }
  } finally { Pop-Location }
  exit
}
if (-not $paths.Desktop) { throw 'Docker Desktop was not found. Repair Docker Desktop, then try again.' }
Start-PUPSJDockerDesktop $paths.Desktop
$ready = $false
for ($attempt = 0; $attempt -lt 60; $attempt++) {
  & $paths.Cli info *> $null
  if ($LASTEXITCODE -eq 0) { $ready = $true; break }
  Write-Host 'Waiting for Docker Desktop...'
  Start-Sleep -Seconds 5
}
if (-not $ready) { throw 'Docker Desktop did not become ready. Open it and resolve any first-run prompts, then try again.' }
Push-Location $AppRoot
try {
  & $paths.Cli compose up -d --wait
  if ($LASTEXITCODE -ne 0) { throw 'Docker Compose could not start PUPSJ RMS.' }
  & (Join-Path $PSScriptRoot 'Get-PUPSJRMSUrl.ps1') -AppRoot $AppRoot -DockerCli $paths.Cli -OpenBrowser
} finally { Pop-Location }
